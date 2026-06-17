-- Add actions JSONB column to notifications for multi-button support
alter table public.notifications
  add column if not exists actions jsonb null;

-- Add execution review deadline to trips
alter table public.trips
  add column if not exists execution_review_deadline date null;
