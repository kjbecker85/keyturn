-- Core data model for the transition command center.

create table public.properties (
  id smallint primary key,
  name text not null unique,
  market text not null,
  pm_code text,
  lat double precision not null,
  lng double precision not null,
  rent_roll_received boolean not null default false
);

create table public.rent_roll_units (
  id bigint generated always as identity primary key,
  property_id smallint not null references public.properties (id) on delete cascade,
  source_row int not null,
  raw jsonb not null,
  unit text not null,
  floorplan text,
  beds int,
  sqft int,
  status text not null,
  resident_name text,
  market_rent numeric,
  lease_rent numeric,
  lease_start date,
  lease_end date,
  deposit numeric,
  balance numeric,
  notes text,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'approved', 'corrected', 'rejected')),
  review_note text,
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id bigint generated always as identity primary key,
  property_id smallint not null references public.properties (id) on delete cascade,
  source_row int not null,
  task text not null,
  function text not null,
  assignee text,
  critical_path boolean not null,
  due_date date not null,
  status text not null check (status in ('Not Started', 'In Progress', 'Blocked', 'Complete')),
  last_updated date not null,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.vendor_contracts (
  id bigint generated always as identity primary key,
  contract_id text not null unique,
  property_id smallint not null references public.properties (id) on delete cascade,
  source_row int not null,
  vendor text not null,
  service text not null,
  monthly_cost numeric not null,
  start_date date not null,
  term_end date not null,
  auto_renew boolean not null,
  notice_days int not null,
  coi_expiration date not null,
  assignable boolean not null,
  notes text,
  decision text check (decision in ('keep', 'terminate', 'renegotiate')),
  decision_reason text,
  updated_at timestamptz not null default now()
);

create table public.exceptions (
  id bigint generated always as identity primary key,
  fingerprint text not null unique,
  rule_key text not null,
  area text not null check (area in ('rent_roll', 'checklist', 'vendors', 'cross_sheet')),
  severity smallint not null check (severity between 1 and 4),
  property_id smallint references public.properties (id) on delete cascade,
  function text,
  title text not null,
  detail text not null,
  due_date date,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  assignee text,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drafts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('escalation', 'termination_notice', 'owner_report', 'morning_brief')),
  exception_id bigint references public.exceptions (id) on delete set null,
  contract_id bigint references public.vendor_contracts (id) on delete set null,
  property_id smallint references public.properties (id) on delete cascade,
  recipient text not null,
  subject text not null,
  body text not null,
  sources jsonb not null default '[]'::jsonb,
  generated_by text not null,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.saved_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  filters jsonb not null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entity text not null,
  entity_id text not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index on public.rent_roll_units (property_id);
create index on public.tasks (property_id);
create index on public.vendor_contracts (property_id);
create index on public.exceptions (status, severity);
create index on public.audit_log (created_at desc);

-- Every update to an operational table writes an audit row with the changed fields.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := to_jsonb(old) - 'updated_at';
  new_row jsonb := to_jsonb(new) - 'updated_at';
  changed_before jsonb;
  changed_after jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, entity, entity_id, action, after)
    values (auth.uid(), tg_table_name, new.id::text, 'create', new_row);
    return new;
  end if;

  select coalesce(jsonb_object_agg(o.key, o.value), '{}'::jsonb),
         coalesce(jsonb_object_agg(o.key, new_row -> o.key), '{}'::jsonb)
    into changed_before, changed_after
  from jsonb_each(old_row) as o
  where o.value is distinct from new_row -> o.key;

  if changed_after <> '{}'::jsonb then
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    values (auth.uid(), tg_table_name, new.id::text, 'update', changed_before, changed_after);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.write_audit() from public, anon, authenticated;

create trigger audit_rent_roll_units before update on public.rent_roll_units
  for each row execute function public.write_audit();
create trigger audit_tasks before update on public.tasks
  for each row execute function public.write_audit();
create trigger audit_vendor_contracts before update on public.vendor_contracts
  for each row execute function public.write_audit();
create trigger audit_exceptions before update on public.exceptions
  for each row execute function public.write_audit();
create trigger audit_drafts_update before update on public.drafts
  for each row execute function public.write_audit();
create trigger audit_drafts_insert after insert on public.drafts
  for each row execute function public.write_audit();

-- Row level security: signed-in users read everything and edit operational
-- records. Only the director can load or reset the base data.
create or replace function public.is_director()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'director'
  );
$$;

revoke execute on function public.is_director() from public, anon;

alter table public.properties enable row level security;
alter table public.rent_roll_units enable row level security;
alter table public.tasks enable row level security;
alter table public.vendor_contracts enable row level security;
alter table public.exceptions enable row level security;
alter table public.drafts enable row level security;
alter table public.saved_views enable row level security;
alter table public.audit_log enable row level security;

create policy "read" on public.properties for select to authenticated using (true);
create policy "read" on public.rent_roll_units for select to authenticated using (true);
create policy "read" on public.tasks for select to authenticated using (true);
create policy "read" on public.vendor_contracts for select to authenticated using (true);
create policy "read" on public.exceptions for select to authenticated using (true);
create policy "read" on public.drafts for select to authenticated using (true);
create policy "read" on public.audit_log for select to authenticated using (true);
create policy "read own" on public.saved_views for select to authenticated using (user_id = (select auth.uid()));

create policy "edit" on public.rent_roll_units for update to authenticated using (true) with check (true);
create policy "edit" on public.tasks for update to authenticated using (true) with check (true);
create policy "edit" on public.vendor_contracts for update to authenticated using (true) with check (true);
create policy "edit" on public.exceptions for update to authenticated using (true) with check (true);
create policy "edit" on public.drafts for update to authenticated using (true) with check (true);

create policy "create" on public.exceptions for insert to authenticated with check (true);
create policy "create" on public.drafts for insert to authenticated with check (true);
create policy "create own" on public.saved_views for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own" on public.saved_views for delete to authenticated using (user_id = (select auth.uid()));

create policy "director loads" on public.properties for insert to authenticated with check ((select public.is_director()));
create policy "director loads" on public.rent_roll_units for insert to authenticated with check ((select public.is_director()));
create policy "director loads" on public.tasks for insert to authenticated with check ((select public.is_director()));
create policy "director loads" on public.vendor_contracts for insert to authenticated with check ((select public.is_director()));

create policy "director resets" on public.properties for delete to authenticated using ((select public.is_director()));
create policy "director resets" on public.exceptions for delete to authenticated using ((select public.is_director()));
create policy "director resets" on public.drafts for delete to authenticated using ((select public.is_director()));
create policy "director resets" on public.audit_log for delete to authenticated using ((select public.is_director()));

-- Live updates across open sessions.
alter publication supabase_realtime add table
  public.exceptions, public.tasks, public.vendor_contracts, public.rent_roll_units, public.drafts;
