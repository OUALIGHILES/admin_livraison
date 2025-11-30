-- Fix permissions and setup storage policies script

-- Grant all privileges to service_role on storage objects
GRANT ALL PRIVILEGES ON TABLE storage.objects TO service_role;

-- Set service_role as the owner of storage.objects table
-- Note: This requires superuser privileges and may not be possible in hosted Supabase
-- The following is commented out as it won't work on hosted Supabase
/*
ALTER TABLE storage.objects OWNER TO service_role;
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'products', 'products', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products');

INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'driver_cars', 'driver_cars', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'driver_cars');

INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'client_houses', 'client_houses', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'client_houses');

-- Create a function to safely create policies without errors if they exist
CREATE OR REPLACE FUNCTION create_storage_policy_if_not_exists(
    policy_name TEXT,
    table_name TEXT,
    operation TEXT,
    role_name TEXT,
    check_condition TEXT DEFAULT '',
    using_condition TEXT DEFAULT ''
) RETURNS void AS $$
BEGIN
    -- Check if policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = policy_name 
        AND tablename = table_name
        AND schemaname = 'storage'
    ) THEN
        -- Build and execute the dynamic SQL
        EXECUTE 'CREATE POLICY ' || quote_ident(policy_name) || 
                ' ON storage.' || quote_ident(table_name) ||
                ' FOR ' || operation ||
                ' TO ' || role_name ||
                CASE 
                    WHEN operation = 'INSERT' AND check_condition != '' THEN ' WITH CHECK (' || check_condition || ')'
                    WHEN operation IN ('SELECT', 'UPDATE', 'DELETE') AND using_condition != '' THEN ' USING (' || using_condition || ')'
                    ELSE ''
                END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Use the function to create policies safely
SELECT create_storage_policy_if_not_exists(
    'Products bucket authenticated insert access',
    'objects',
    'INSERT',
    'authenticated',
    'bucket_id = ''products''',
    ''
);

SELECT create_storage_policy_if_not_exists(
    'Products bucket authenticated select access',
    'objects',
    'SELECT',
    'authenticated, anon',
    '',
    'bucket_id = ''products'''
);

SELECT create_storage_policy_if_not_exists(
    'Products bucket authenticated update access',
    'objects',
    'UPDATE',
    'authenticated',
    '',
    'bucket_id = ''products'''
);

SELECT create_storage_policy_if_not_exists(
    'Products bucket authenticated delete access',
    'objects',
    'DELETE',
    'authenticated',
    '',
    'bucket_id = ''products'''
);

SELECT create_storage_policy_if_not_exists(
    'Driver cars bucket authenticated insert access',
    'objects',
    'INSERT',
    'authenticated',
    'bucket_id = ''driver_cars''',
    ''
);

SELECT create_storage_policy_if_not_exists(
    'Driver cars bucket authenticated select access',
    'objects',
    'SELECT',
    'authenticated, anon',
    '',
    'bucket_id = ''driver_cars'''
);

SELECT create_storage_policy_if_not_exists(
    'Driver cars bucket authenticated update access',
    'objects',
    'UPDATE',
    'authenticated',
    '',
    'bucket_id = ''driver_cars'''
);

SELECT create_storage_policy_if_not_exists(
    'Driver cars bucket authenticated delete access',
    'objects',
    'DELETE',
    'authenticated',
    '',
    'bucket_id = ''driver_cars'''
);

SELECT create_storage_policy_if_not_exists(
    'Client houses bucket authenticated insert access',
    'objects',
    'INSERT',
    'authenticated',
    'bucket_id = ''client_houses''',
    ''
);

SELECT create_storage_policy_if_not_exists(
    'Client houses bucket authenticated select access',
    'objects',
    'SELECT',
    'authenticated, anon',
    '',
    'bucket_id = ''client_houses'''
);

SELECT create_storage_policy_if_not_exists(
    'Client houses bucket authenticated update access',
    'objects',
    'UPDATE',
    'authenticated',
    '',
    'bucket_id = ''client_houses'''
);

SELECT create_storage_policy_if_not_exists(
    'Client houses bucket authenticated delete access',
    'objects',
    'DELETE',
    'authenticated',
    '',
    'bucket_id = ''client_houses'''
);

-- Public access policies
SELECT create_storage_policy_if_not_exists(
    'Products bucket public select access',
    'objects',
    'SELECT',
    'authenticated, anon',
    '',
    'bucket_id = ''products'''
);

SELECT create_storage_policy_if_not_exists(
    'Driver cars bucket public select access',
    'objects',
    'SELECT',
    'authenticated, anon',
    '',
    'bucket_id = ''driver_cars'''
);

SELECT create_storage_policy_if_not_exists(
    'Client houses bucket public select access',
    'objects',
    'SELECT',
    'authenticated, anon',
    '',
    'bucket_id = ''client_houses'''
);