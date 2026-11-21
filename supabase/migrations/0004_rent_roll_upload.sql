-- Rent roll upload: the director loads a property's rent roll from a CSV or Excel file.
-- Loading replaces that property's units, marks the rent roll received, and logs one
-- activity row for the upload.

create policy "director replaces" on public.rent_roll_units
  for delete to authenticated using ((select public.is_director()));

create policy "director marks received" on public.properties
  for update to authenticated using ((select public.is_director())) with check ((select public.is_director()));

create or replace function public.log_rent_roll_upload(p_property smallint, p_file text, p_units int, p_replaced int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_director() then
    raise exception 'Only the director can upload a rent roll.';
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (auth.uid(), 'properties', p_property::text, 'upload',
          jsonb_build_object('file', p_file, 'units', p_units, 'replaced', p_replaced));
end;
$$;

revoke execute on function public.log_rent_roll_upload(smallint, text, int, int) from public, anon;
grant execute on function public.log_rent_roll_upload(smallint, text, int, int) to authenticated;
