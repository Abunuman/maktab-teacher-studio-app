-- Run this once in your Supabase project's SQL Editor (Database > SQL Editor > New query).
-- It creates the single table Maktab uses to store your roster, study plans,
-- weekly reports, and pricing, and locks every row to the signed-in user.

create table if not exists maktab_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table maktab_data enable row level security;

create policy "Users can read their own data"
  on maktab_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own data"
  on maktab_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own data"
  on maktab_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own data"
  on maktab_data for delete
  using (auth.uid() = user_id);
