-- ============================================================
-- MON HERBIER — Table library_plants (bibliothèque personnelle)
-- A executer UNE SEULE FOIS dans SQL Editor Supabase.
-- ============================================================

create table if not exists library_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  latin text,
  type text,
  description text,
  light text,
  water text,
  plantation text,
  propagation text,
  harvest text,
  companions text,
  tips text,
  problems text,
  photo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists library_plants_user_id_idx on library_plants(user_id);
create index if not exists library_plants_created_at_idx on library_plants(created_at desc);

alter table library_plants enable row level security;

drop policy if exists "Users read own library plants" on library_plants;
create policy "Users read own library plants"
  on library_plants for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own library plants" on library_plants;
create policy "Users insert own library plants"
  on library_plants for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own library plants" on library_plants;
create policy "Users update own library plants"
  on library_plants for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own library plants" on library_plants;
create policy "Users delete own library plants"
  on library_plants for delete
  using (auth.uid() = user_id);

drop trigger if exists library_plants_updated_at on library_plants;
create trigger library_plants_updated_at
  before update on library_plants
  for each row
  execute function set_updated_at();
