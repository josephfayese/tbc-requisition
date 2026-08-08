-- 008_remove_trainer_role.sql
-- Training complete: retire the tentative trainer role (added in 006).

-- Reassign the remaining trainer user to payment executor
update profiles set role = 'chima' where role = 'trainer';

-- Restore the original role constraint
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('hod','dg','backup','finance','pastor','chima','admin'));

-- Strip trainer from every module_visibility array
update settings s
set value = (
  select jsonb_object_agg(t.key, t.val - 'trainer')
  from jsonb_each(s.value::jsonb) as t(key, val)
)::text
where s.key = 'module_visibility';
