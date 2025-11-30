-- Create storage buckets and set up RLS policies for image storage

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

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated upload to products bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated upload to driver_cars bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated upload to client_houses bucket" ON storage.objects;
  
  DROP POLICY IF EXISTS "Allow authenticated read access to products" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated read access to driver_cars" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated read access to client_houses" ON storage.objects;
  
  DROP POLICY IF EXISTS "Allow authenticated update to products bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated update to driver_cars bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated update to client_houses bucket" ON storage.objects;
  
  DROP POLICY IF EXISTS "Allow authenticated delete from products bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete from driver_cars bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete from client_houses bucket" ON storage.objects;
  
  DROP POLICY IF EXISTS "Allow public read access to products" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to driver_cars" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to client_houses" ON storage.objects;
EXCEPTION
  WHEN undefined_table OR undefined_object THEN
    -- Ignore if policies don't exist
    NULL;
END $$;

-- Policies for authenticated users to upload images (INSERT)
CREATE POLICY "Allow authenticated upload to products bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Allow authenticated upload to driver_cars bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated upload to client_houses bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client_houses');

-- Policies for authenticated users to view images (SELECT)
CREATE POLICY "Allow authenticated read access to products" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated read access to driver_cars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated read access to client_houses" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'client_houses');

-- Policies for authenticated users to update images (UPDATE)
CREATE POLICY "Allow authenticated update to products bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated update to driver_cars bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated update to client_houses bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'client_houses');

-- Policies for authenticated users to delete images (DELETE)
CREATE POLICY "Allow authenticated delete from products bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated delete from driver_cars bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow authenticated delete from client_houses bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'client_houses');

-- Policies for public access (SELECT) - Optional (for publicly accessible images)
CREATE POLICY "Allow public read access to products" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'products');

CREATE POLICY "Allow public read access to driver_cars" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'driver_cars');

CREATE POLICY "Allow public read access to client_houses" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'client_houses');