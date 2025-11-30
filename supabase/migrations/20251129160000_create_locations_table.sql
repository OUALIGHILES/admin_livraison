-- Create locations table

CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage locations
CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

-- Insert some default locations
INSERT INTO locations (name, address) VALUES
  ('Paris City Center', '123 Main St, Paris'),
  ('North District', '456 North Ave, Paris'),
  ('South District', '789 South Blvd, Paris'),
  ('East District', '101 East St, Paris'),
  ('West District', '202 West Rd, Paris');