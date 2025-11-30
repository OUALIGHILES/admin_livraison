-- Create storage object policies for the new buckets

-- Allow authenticated users to upload and download images
INSERT INTO storage.object_rules (bucket_id, policy_name, prefix, operation, action, constraint_expr)
VALUES
  -- Products bucket policies
  ('products', 'Allow all for products', '*', 'upload', 'allow', '(true)'),
  ('products', 'Allow all for products', '*', 'download', 'allow', '(true)'),
  
  -- Driver cars bucket policies  
  ('driver_cars', 'Allow all for driver_cars', '*', 'upload', 'allow', '(true)'),
  ('driver_cars', 'Allow all for driver_cars', '*', 'download', 'allow', '(true)'),
  
  -- Client houses bucket policies
  ('client_houses', 'Allow all for client_houses', '*', 'upload', 'allow', '(true)'),
  ('client_houses', 'Allow all for client_houses', '*', 'download', 'allow', '(true)');