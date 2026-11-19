-- Notes people add to an exception: [{ by, at, text }]
alter table public.exceptions add column notes jsonb not null default '[]'::jsonb;
