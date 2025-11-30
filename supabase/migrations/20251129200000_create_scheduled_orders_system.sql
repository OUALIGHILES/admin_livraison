-- Create scheduled_orders table for order scheduling functionality

CREATE TABLE scheduled_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  driver_id UUID,
  location TEXT NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  driver_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'new', 'in_progress', 'completed', 'cancelled')),
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_order_ref UUID, -- Reference to the actual order once scheduled time is reached
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a junction table for scheduled order items
CREATE TABLE scheduled_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_order_id UUID NOT NULL REFERENCES scheduled_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  admin_price DECIMAL(10,2) NOT NULL,
  driver_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scheduled_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage scheduled orders" ON scheduled_orders
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

CREATE POLICY "Admins can manage scheduled order items" ON scheduled_order_items
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

-- Add a new column to reference the actual order if processed
ALTER TABLE scheduled_orders ADD COLUMN IF NOT EXISTS actual_order_ref UUID;

-- Function to check if scheduled time is reached and create actual order
CREATE OR REPLACE FUNCTION process_scheduled_orders()
RETURNS VOID AS $$
DECLARE
  rec RECORD;
  new_order_id UUID;
BEGIN
  -- Loop through all scheduled orders that have reached their scheduled time
  FOR rec IN
    SELECT * FROM scheduled_orders
    WHERE status = 'scheduled'
    AND scheduled_datetime <= NOW()
  LOOP
    -- Create the actual order in the orders table
    INSERT INTO orders (client_id, driver_id, location, total_amount, driver_amount, status)
    VALUES (rec.client_id, rec.driver_id, rec.location, rec.total_amount, rec.driver_amount, 'new')
    RETURNING id INTO new_order_id;

    -- Move the scheduled order items to the actual order items
    INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
    SELECT new_order_id, product_id, quantity, admin_price, driver_price
    FROM scheduled_order_items
    WHERE scheduled_order_id = rec.id;

    -- Update the scheduled order to mark it as processed
    UPDATE scheduled_orders
    SET status = 'active', actual_order_ref = new_order_id
    WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a periodic job to run the scheduled order processor every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'process-scheduled-orders',
    '* * * * *',  -- Run every minute
    $$SELECT process_scheduled_orders();$$
);