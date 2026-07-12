-- Widen notifications.type check constraint to cover reminder/cron notification types.
-- The cron routes insert 'payment_reminder', 'retirement_reminder', and
-- 'reconciliation_report', which the original constraint (approved/rejected only)
-- rejected with a 400 — in-app reminder notifications were silently failing.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('approved', 'rejected', 'payment_reminder', 'retirement_reminder', 'reconciliation_report'));
