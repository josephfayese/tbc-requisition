-- 006_trainer_role.sql
-- Tentative "trainer" role for onboarding/demo walkthroughs (Chima).
-- Can initiate requisitions (exempt from the Mon–Wed window) AND approve/reject,
-- but has no admin surface. Remove after training is complete.

-- Widen the profiles role check to the full role set + trainer
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('hod','dg','backup','finance','pastor','chima','admin','trainer'));

-- Grant trainer the approve + retirement sidebar modules in module_visibility
update settings
set value = (
  value::jsonb
  || jsonb_build_object('approve',
       case when value::jsonb->'approve' ? 'trainer' then value::jsonb->'approve'
            else (value::jsonb->'approve') || '["trainer"]'::jsonb end)
  || jsonb_build_object('retirement',
       case when value::jsonb->'retirement' ? 'trainer' then value::jsonb->'retirement'
            else (value::jsonb->'retirement') || '["trainer"]'::jsonb end)
)::text
where key = 'module_visibility';
