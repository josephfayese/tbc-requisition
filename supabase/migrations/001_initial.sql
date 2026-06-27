-- Enable UUID
create extension if not exists "pgcrypto";

-- Profiles (linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('hod','dg','backup','chima','admin')),
  dept text,
  created_at timestamptz default now()
);

-- Departments
create table departments (
  id serial primary key,
  name text not null unique
);

insert into departments (name) values
  ('Programs'), ('Media'), ('Operations'), ('Facilities'), ('Music'), ('Outreach');

-- Requisitions
create table requisitions (
  id serial primary key,
  req_number text not null unique,
  user_id uuid not null references profiles(id),
  dept text not null,
  created_at timestamptz default now()
);

-- Line items
create table line_items (
  id serial primary key,
  req_id integer not null references requisitions(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  reason text,
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  paid_by uuid references profiles(id),
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Audit log (immutable — no updates/deletes)
create table audit_log (
  id serial primary key,
  req_id integer references requisitions(id),
  line_item_id integer references line_items(id),
  actor_id uuid references profiles(id),
  actor_name text not null,
  action text not null,
  detail text,
  created_at timestamptz default now()
);

-- Settings (for DG availability toggle)
create table settings (
  key text primary key,
  value text not null
);
insert into settings values ('dg_available', 'true');

-- RLS (simplified — enable for production hardening later)
alter table profiles enable row level security;
alter table requisitions enable row level security;
alter table line_items enable row level security;
alter table audit_log enable row level security;
alter table settings enable row level security;

-- Allow authenticated users to read everything (simplify for MVP)
create policy "auth read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "auth read requisitions" on requisitions for select using (auth.role() = 'authenticated');
create policy "auth read line_items" on line_items for select using (auth.role() = 'authenticated');
create policy "auth read audit" on audit_log for select using (auth.role() = 'authenticated');
create policy "auth read settings" on settings for select using (auth.role() = 'authenticated');

-- Write policies (all authenticated for MVP; enforce role in app layer)
create policy "auth write requisitions" on requisitions for insert with check (auth.role() = 'authenticated');
create policy "auth write line_items" on line_items for insert with check (auth.role() = 'authenticated');
create policy "auth update line_items" on line_items for update using (auth.role() = 'authenticated');
create policy "auth write audit" on audit_log for insert with check (auth.role() = 'authenticated');
create policy "auth update settings" on settings for update using (auth.role() = 'authenticated');
create policy "auth write profiles" on profiles for insert with check (auth.uid() = id);
