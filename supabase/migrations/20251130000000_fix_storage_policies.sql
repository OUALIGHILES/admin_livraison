-- Setup script for storage buckets and RLS policies with proper permissions

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

-- Enable Row Level Security on objects table
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

-- Create policies for authenticated users to access the storage buckets

-- Products bucket policies
CREATE POLICY "Products bucket authenticated insert access" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Products bucket authenticated select access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'products');

CREATE POLICY "Products bucket authenticated update access" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Products bucket authenticated delete access" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'products');

-- Driver cars bucket policies
CREATE POLICY "Driver cars bucket authenticated insert access" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver_cars');

CREATE POLICY "Driver cars bucket authenticated select access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'driver_cars');

CREATE POLICY "Driver cars bucket authenticated update access" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'driver_cars');

CREATE POLICY "Driver cars bucket authenticated delete access" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'driver_cars');

-- Client houses bucket policies
CREATE POLICY "Client houses bucket authenticated insert access" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client_houses');

CREATE POLICY "Client houses bucket authenticated select access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'client_houses');

CREATE POLICY "Client houses bucket authenticated update access" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'client_houses');

CREATE POLICY "Client houses bucket authenticated delete access" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'client_houses');

-- Public access policies for all buckets (for displaying images to users)
CREATE POLICY "Products bucket public select access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'products');

CREATE POLICY "Driver cars bucket public select access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'driver_cars');

CREATE POLICY "Client houses bucket public select access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'client_houses');