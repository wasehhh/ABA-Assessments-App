-- Update check_user_invite to return Org Name
drop function if exists check_user_invite(text);

create or replace function check_user_invite(lookup_email text)
returns table (
  email text,
  org_id uuid,
  role text,
  org_name text
) language plpgsql security definer as $$
begin
  return query
  select 
    ui.email,
    ui.org_id,
    ui.role,
    o.name as org_name
  from user_invites ui
  join organizations o on o.id = ui.org_id
  where lower(ui.email) = lower(lookup_email);
end;
$$;
grant execute on function check_user_invite to authenticated, anon, service_role;
