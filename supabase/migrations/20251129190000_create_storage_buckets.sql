-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, owner_id, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES
  ('products', 'products', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'),
  ('driver_cars', 'driver_cars', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}'),
  ('client_houses', 'client_houses', NULL, NOW(), NOW(), true, false, 5242880, '{image/png,image/jpg,image/jpeg,image/webp,image/gif,image/svg+xml}');