-- ============================================================
-- MON HERBIER — Ajouter des champs detailles a la table plants
-- A executer UNE SEULE FOIS dans SQL Editor Supabase.
-- ============================================================
-- Chaque plante peut maintenant avoir sa propre description,
-- plantation, multiplication, recolte, compagnonnage, conseils,
-- problemes frequents (comme dans la bibliotheque).

alter table plants add column if not exists description text;
alter table plants add column if not exists plantation text;
alter table plants add column if not exists propagation text;
alter table plants add column if not exists harvest text;
alter table plants add column if not exists companions text;
alter table plants add column if not exists tips text;
alter table plants add column if not exists problems text;
