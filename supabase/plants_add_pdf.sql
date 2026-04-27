-- Ajoute un champ pdf_url pour stocker un document PDF par plante
alter table plants add column if not exists pdf_url text;
alter table plants add column if not exists pdf_name text;
