-- Create clients and drivers tables that are referenced but not defined

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  house_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  car_type TEXT NOT NULL,
  car_image_url TEXT,
  location TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_delivery', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table (if not already exists)
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'sub_admin' CHECK (role IN ('super_admin', 'sub_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table
CREATE POLICY "Clients are viewable by admins" ON clients
  FOR SELECT USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

-- Create RLS policies for drivers table
CREATE POLICY "Drivers are viewable by admins" ON drivers
  FOR SELECT USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

CREATE POLICY "Admins can manage drivers" ON drivers
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

-- Create RLS policies for admins table
CREATE POLICY "Admins are viewable by admins" ON admins
  FOR SELECT USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

CREATE POLICY "Super admins can manage all admins" ON admins
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );