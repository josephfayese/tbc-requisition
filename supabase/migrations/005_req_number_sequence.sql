-- Atomic requisition numbering.
-- The app previously derived the next REQ number from a row count, which
-- collides under concurrent submissions (duplicate key on req_number unique
-- constraint → "submit fails after the first requisition"). Use a sequence
-- seeded from the current max so numbering is race-free.

do $$
declare
  max_num integer;
begin
  select coalesce(max(substring(req_number from '\d+')::integer), 2000)
    into max_num
  from requisitions;

  execute format('create sequence if not exists req_number_seq start with %s', max_num + 1);
end $$;

create or replace function next_req_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'REQ-' || lpad(nextval('req_number_seq')::text, 4, '0');
$$;

grant execute on function next_req_number() to authenticated;
