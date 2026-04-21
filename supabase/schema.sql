-- ============================================================
-- MON HERBIER — Schéma de base de données Supabase
-- ============================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query

-- Table des plantes
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  latin text,
  type text,
  location text,
  light text,
  water text,
  notes text,
  photo text,
  acquired date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour accélérer les recherches par utilisateur
create index if not exists plants_user_id_idx on plants(user_id);
create index if not exists plants_created_at_idx on plants(created_at desc);

-- ============================================================
-- Row Level Security (RLS)
-- Chaque utilisateur ne voit QUE ses propres plantes
-- ============================================================

alter table plants enable row level security;

-- Politique : un utilisateur peut voir uniquement ses plantes
create policy "Users read their own plants"
  on plants for select
  using (auth.uid() = user_id);

-- Politique : un utilisateur peut créer des plantes liées à son compte
create policy "Users insert their own plants"
  on plants for insert
  with check (auth.uid() = user_id);

-- Politique : un utilisateur peut modifier uniquement ses plantes
create policy "Users update their own plants"
  on plants for update
  using (auth.uid() = user_id);

-- Politique : un utilisateur peut supprimer uniquement ses plantes
create policy "Users delete their own plants"
  on plants for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Mise à jour automatique du champ updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists plants_updated_at on plants;
create trigger plants_updated_at
  before update on plants
  for each row
  execute function set_updated_at();
