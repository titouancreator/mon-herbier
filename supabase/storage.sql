-- ============================================================
-- MON HERBIER — Bucket Supabase Storage pour les photos de plantes
-- A executer UNE SEULE FOIS dans SQL Editor Supabase.
-- ============================================================

-- Bucket public pour les photos (visibles par tout le monde, mais
-- seul le proprietaire peut uploader/modifier/supprimer ses propres fichiers).
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- Lecture publique
drop policy if exists "Plant photos public read" on storage.objects;
create policy "Plant photos public read"
on storage.objects for select
using (bucket_id = 'plant-photos');

-- Upload uniquement dans son propre dossier ({user_id}/fichier.jpg)
drop policy if exists "Users upload own plant photos" on storage.objects;
create policy "Users upload own plant photos"
on storage.objects for insert
with check (
  bucket_id = 'plant-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Update uniquement de ses propres fichiers
drop policy if exists "Users update own plant photos" on storage.objects;
create policy "Users update own plant photos"
on storage.objects for update
using (
  bucket_id = 'plant-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete uniquement de ses propres fichiers
drop policy if exists "Users delete own plant photos" on storage.objects;
create policy "Users delete own plant photos"
on storage.objects for delete
using (
  bucket_id = 'plant-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
