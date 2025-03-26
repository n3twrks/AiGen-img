# Supabase SQL Documentation

Ce fichier documente tous les changements SQL effectués dans la base de données Supabase.

## Table des matières
- [Soft Delete System avec Nettoyage Automatique](#soft-delete-system-avec-nettoyage-automatique)

## Soft Delete System avec Nettoyage Automatique
*Date: 26 Mars 2024*

### Structure des Tables

```sql
-- Table saved_images (structure existante avec deleted_at)
-- Note: Cette table existe déjà, seule la colonne deleted_at a été ajoutée
alter table saved_images 
add column if not exists deleted_at timestamp with time zone;

-- Table de logs pour le monitoring des nettoyages
create table if not exists cleanup_logs (
    id uuid default gen_random_uuid() primary key,
    execution_time timestamptz default now(),
    images_checked int,
    storage_files_deleted int,
    database_records_deleted int,
    error_message text
);
```

### Fonction de Nettoyage Automatique

```sql
-- Fonction pour nettoyer les images supprimées après 30 jours
create or replace function cleanup_deleted_images()
returns void
language plpgsql
security definer
as $$
declare
    storage_object record;
    images_checked int := 0;
    storage_deleted int := 0;
    db_deleted int := 0;
    error_msg text := null;
begin
    -- Compter les images à vérifier
    select count(*) into images_checked
    from saved_images
    where deleted_at is not null
    and deleted_at < now() - interval '30 days';

    -- Récupérer et supprimer les images
    for storage_object in 
        select user_id, image_url
        from saved_images
        where deleted_at is not null
        and deleted_at < now() - interval '30 days'
    loop
        begin
            -- Extraire le chemin du fichier
            declare
                file_path text;
            begin
                file_path := split_part(storage_object.image_url, '/images/', 2);
                -- Supprimer du storage
                perform storage.delete('images', file_path);
                storage_deleted := storage_deleted + 1;
            exception when others then
                error_msg := coalesce(error_msg || '; ', '') || 
                            'Failed to delete: ' || file_path;
            end;
        end;
    end loop;

    -- Supprimer les enregistrements de la base
    with deleted_records as (
        delete from saved_images
        where deleted_at is not null
        and deleted_at < now() - interval '30 days'
        returning id
    )
    select count(*) into db_deleted from deleted_records;

    -- Logger les résultats
    insert into cleanup_logs 
        (images_checked, storage_files_deleted, database_records_deleted, error_message)
    values 
        (images_checked, storage_deleted, db_deleted, error_msg);
end;
$$;
```

### Configuration du Job Cron

```sql
-- Activer l'extension pg_cron si pas déjà fait
create extension if not exists pg_cron;

-- Programmer le job pour s'exécuter tous les jours à minuit
select cron.schedule(
    'cleanup-deleted-images',           -- nom unique du job
    '0 0 * * *',                       -- tous les jours à minuit
    'select cleanup_deleted_images();'  -- la commande à exécuter
);
```

### Policies de Sécurité

```sql
-- Policy pour permettre aux utilisateurs de soft-delete leurs propres images
create policy "Users can soft delete their own images"
    on saved_images
    for update
    using ((auth.uid())::text = (user_id)::text)
    with check ((auth.uid())::text = (user_id)::text);
```

### Requêtes de Monitoring

```sql
-- Vérifier les images soft-deleted
select 
    id,
    user_id,
    prompt,
    image_url,
    deleted_at,
    now() - deleted_at as "time_since_deletion",
    (now() - interval '30 days') > deleted_at as "ready_for_cleanup"
from saved_images
where deleted_at is not null
order by deleted_at desc;

-- Voir les statistiques de nettoyage
select * from cleanup_logs order by execution_time desc;
```

### Notes Importantes
- Les images sont marquées comme supprimées avec `deleted_at` mais restent accessibles pendant 30 jours
- Le nettoyage automatique s'exécute chaque nuit à minuit
- Les fichiers sont supprimés à la fois de la base de données et du bucket de stockage
- Toutes les opérations de nettoyage sont enregistrées dans `cleanup_logs` 