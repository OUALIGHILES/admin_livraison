-- Setup script for storage buckets and RLS policies for Supabase

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, owner_id, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'products', 'products', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products');

INSERT INTO storage.buckets (id, name, owner_id, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'driver_cars', 'driver_cars', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'driver_cars');

INSERT INTO storage.buckets (id, name, owner_id, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'client_houses', 'client_houses', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'client_houses');

-- Check if RLS is already enabled, if not, enable it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'objects_row_level_security_enforced' 
    AND table_name = 'objects' 
    AND table_schema = 'storage'
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Function to safely drop policies if they exist
CREATE OR REPLACE FUNCTION drop_policy_if_exists(policy_name TEXT, table_name TEXT, schema_name TEXT DEFAULT 'storage')
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = schema_name AND tablename = table_name AND policyname = policy_name) THEN
    EXECUTE 'DROP POLICY ' || quote_ident(policy_name) || ' ON ' || quote_ident(schema_name) || '.' || quote_ident(table_name) || ';';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing policies if they exist using the helper function
SELECT drop_policy_if_exists('Allow authenticated upload to products bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated upload to driver_cars bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated upload to client_houses bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated read access to products', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated read access to driver_cars', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated read access to client_houses', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated update to products bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated update to driver_cars bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated update to client_houses bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated delete from products bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated delete from driver_cars bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow authenticated delete from client_houses bucket', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow public read access to products', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow public read access to driver_cars', 'objects', 'storage');
SELECT drop_policy_if_exists('Allow public read access to client_houses', 'objects', 'storage');

-- Create policies for authenticated users to upload images (INSERT)
CREATE POLICY "Allow authenticated upload to products bucket"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Allow authenticated upload to driver_cars bucket"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated upload to client_houses bucket"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client_houses');

-- Policies for authenticated users to view images (SELECT)
CREATE POLICY "Allow authenticated read access to products"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated read access to driver_cars"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated read access to client_houses"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'client_houses');

-- Policies for authenticated users to update images (UPDATE)
CREATE POLICY "Allow authenticated update to products bucket"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated update to driver_cars bucket"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated update to client_houses bucket"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'client_houses');

-- Policies for authenticated users to delete images (DELETE)
CREATE POLICY "Allow authenticated delete from products bucket"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated delete from driver_cars bucket"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated delete from client_houses bucket"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'client_houses');

-- Policies for public access (SELECT) - Optional (for publicly accessible images)
CREATE POLICY "Allow public read access to products"
ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'products');

CREATE POLICY "Allow public read access to driver_cars"
ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow public read access to client_houses"
ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'client_houses');