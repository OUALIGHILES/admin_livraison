-- Supabase Dashboard Database Seed Data
-- This script provides sample data to populate your database tables

-- Function to create the first admin user with seed data
-- This function creates both an auth user and a corresponding admin record
-- Usage: SELECT create_first_admin('admin@example.com', 'Admin User', 'super_admin');

CREATE OR REPLACE FUNCTION create_first_admin(
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'super_admin'
)
RETURNS TABLE(admin_id UUID, email TEXT, full_name TEXT, role TEXT) AS $$
DECLARE
    v_admin_record RECORD;
BEGIN
    -- Insert the admin record directly into the admins table
    -- The id should match the auth user's UUID (in a real scenario, you'd create the auth user first)
    INSERT INTO admins (id, email, full_name, role)
    VALUES (
        gen_random_uuid(), -- Generate a new UUID
        p_email,
        p_full_name,
        p_role
    )
    RETURNING id, email, full_name, role INTO v_admin_record;

    -- Return the created admin record
    RETURN QUERY SELECT
        v_admin_record.id,
        v_admin_record.email,
        v_admin_record.full_name,
        v_admin_record.role;
END;
$$ LANGUAGE plpgsql;

-- Create the first admin user
-- This will create a super admin with the specified details
SELECT * FROM create_first_admin('admin@example.com', 'System Administrator', 'super_admin');

-- Insert sample products if they don't exist
INSERT INTO products (name, admin_price)
SELECT 'Pizza Margherita', 12.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Pizza Margherita');
INSERT INTO products (name, admin_price)
SELECT 'Burger Classique', 10.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Burger Classique');
INSERT INTO products (name, admin_price)
SELECT 'Salade César', 8.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Salade César');
INSERT INTO products (name, admin_price)
SELECT 'Sushi Assorti', 18.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Sushi Assorti');
INSERT INTO products (name, admin_price)
SELECT 'Poulet Grillé', 14.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Poulet Grillé');

-- Insert sample drivers if they don't exist
INSERT INTO drivers (full_name, car_type, car_image_url, location, phone_number, status)
SELECT 'Jean Dupont', 'Volkswagen Golf', 'https://example.com/car1.jpg', 'Paris 15ème', '+33612345678', 'available'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE full_name = 'Jean Dupont');
INSERT INTO drivers (full_name, car_type, car_image_url, location, phone_number, status)
SELECT 'Marie Curie', 'Renault Clio', 'https://example.com/car2.jpg', 'Paris 16ème', '+33623456789', 'available'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE full_name = 'Marie Curie');
INSERT INTO drivers (full_name, car_type, car_image_url, location, phone_number, status)
SELECT 'Pierre Martin', 'Peugeot 208', 'https://example.com/car3.jpg', 'Paris 8ème', '+33634567890', 'in_delivery'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE full_name = 'Pierre Martin');
INSERT INTO drivers (full_name, car_type, car_image_url, location, phone_number, status)
SELECT 'Sophie Laurent', 'Citroën C3', 'https://example.com/car4.jpg', 'Paris 12ème', '+33645678901', 'offline'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE full_name = 'Sophie Laurent');

-- Insert sample clients if they don't exist
INSERT INTO clients (full_name, location, phone_number, house_image_url)
SELECT 'Client A', 'Paris 1er', '+33656789012', 'https://example.com/house1.jpg'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE full_name = 'Client A');
INSERT INTO clients (full_name, location, phone_number, house_image_url)
SELECT 'Client B', 'Paris 2ème', '+33667890123', 'https://example.com/house2.jpg'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE full_name = 'Client B');
INSERT INTO clients (full_name, location, phone_number, house_image_url)
SELECT 'Client C', 'Paris 3ème', '+33678901234', 'https://example.com/house3.jpg'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE full_name = 'Client C');
INSERT INTO clients (full_name, location, phone_number, house_image_url)
SELECT 'Client D', 'Paris 4ème', '+33689012345', 'https://example.com/house4.jpg'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE full_name = 'Client D');

-- Insert driver product prices (how much driver gets for each product) if they don't exist
INSERT INTO driver_product_prices (driver_id, product_id, driver_price)
SELECT
  d.id as driver_id,
  p.id as product_id,
  p.admin_price * 0.3 as driver_price  -- Driver gets 30% of admin price
FROM drivers d, products p
WHERE d.id IN (SELECT id FROM drivers LIMIT 4)
AND p.id IN (SELECT id FROM products LIMIT 5)
AND NOT EXISTS (
    SELECT 1 FROM driver_product_prices WHERE
    driver_id = d.id AND product_id = p.id
);

-- Insert sample orders if they don't exist
INSERT INTO orders (client_id, driver_id, location, status, total_amount, driver_amount)
SELECT
  c.id as client_id,
  (SELECT id FROM drivers ORDER BY RANDOM() LIMIT 1) as driver_id,
  c.location as location,
  CASE FLOOR(RANDOM() * 4)
    WHEN 0 THEN 'new'
    WHEN 1 THEN 'in_progress'
    WHEN 2 THEN 'completed'
    WHEN 3 THEN 'cancelled'
  END as status,
  (SELECT admin_price FROM products ORDER BY RANDOM() LIMIT 1) * 1.1 as total_amount,
  (SELECT admin_price FROM products ORDER BY RANDOM() LIMIT 1) * 0.3 as driver_amount
FROM clients c
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE client_id = c.id)
LIMIT 10;

-- Insert sample order items (simplified approach to avoid complex queries) if they don't exist
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 0), (SELECT id FROM products LIMIT 1 OFFSET 0), 2, 12.99, 3.90)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 0)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 0)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 0), (SELECT id FROM products LIMIT 1 OFFSET 1), 1, 10.99, 3.30)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 0)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 1)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 1), (SELECT id FROM products LIMIT 1 OFFSET 2), 1, 8.99, 2.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 1)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 2)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 2), (SELECT id FROM products LIMIT 1 OFFSET 3), 2, 18.99, 5.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 2)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 3)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 3), (SELECT id FROM products LIMIT 1 OFFSET 4), 1, 14.99, 4.50)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 3)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 4)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 4), (SELECT id FROM products LIMIT 1 OFFSET 0), 3, 12.99, 3.90)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 4)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 0)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 5), (SELECT id FROM products LIMIT 1 OFFSET 1), 1, 10.99, 3.30)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 5)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 1)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 6), (SELECT id FROM products LIMIT 1 OFFSET 2), 2, 8.99, 2.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 6)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 2)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 7), (SELECT id FROM products LIMIT 1 OFFSET 3), 1, 18.99, 5.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 7)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 3)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 8), (SELECT id FROM products LIMIT 1 OFFSET 4), 2, 14.99, 4.50)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 8)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 4)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 1), (SELECT id FROM products LIMIT 1 OFFSET 1), 1, 10.99, 3.30)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 1)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 1)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 2), (SELECT id FROM products LIMIT 1 OFFSET 0), 1, 12.99, 3.90)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 2)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 0)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 3), (SELECT id FROM products LIMIT 1 OFFSET 1), 2, 10.99, 3.30)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 3)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 1)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 4), (SELECT id FROM products LIMIT 1 OFFSET 3), 1, 18.99, 5.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 4)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 3)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 5), (SELECT id FROM products LIMIT 1 OFFSET 4), 1, 14.99, 4.50)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 5)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 4)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 6), (SELECT id FROM products LIMIT 1 OFFSET 0), 2, 12.99, 3.90)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 6)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 0)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 7), (SELECT id FROM products LIMIT 1 OFFSET 2), 1, 8.99, 2.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 7)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 2)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 8), (SELECT id FROM products LIMIT 1 OFFSET 1), 1, 10.99, 3.30)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 8)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 1)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 9), (SELECT id FROM products LIMIT 1 OFFSET 3), 3, 18.99, 5.70)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 9)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 3)
);
INSERT INTO order_items (order_id, product_id, quantity, admin_price, driver_price)
SELECT ((SELECT id FROM orders LIMIT 1 OFFSET 9), (SELECT id FROM products LIMIT 1 OFFSET 4), 1, 14.99, 4.50)
WHERE NOT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = (SELECT id FROM orders LIMIT 1 OFFSET 9)
    AND product_id = (SELECT id FROM products LIMIT 1 OFFSET 4)
);

-- Insert sample driver payments if they don't exist
INSERT INTO driver_payments (driver_id, pending_amount, paid_amount)
SELECT
  d.id,
  CASE
    WHEN d.status = 'in_delivery' THEN (SELECT COALESCE(SUM(driver_amount), 0) FROM orders WHERE driver_id = d.id AND status = 'in_progress')
    ELSE 0
  END,
  CASE
    WHEN d.status != 'in_delivery' THEN (SELECT COALESCE(SUM(driver_amount), 0) FROM orders WHERE driver_id = d.id AND status = 'completed')
    ELSE 0
  END
FROM drivers d
WHERE NOT EXISTS (SELECT 1 FROM driver_payments WHERE driver_id = d.id);

-- Insert sample payment transactions if they don't exist
INSERT INTO payment_transactions (driver_id, amount, payment_date, notes)
SELECT
  d.id as driver_id,
  (SELECT COALESCE(SUM(driver_amount), 0) FROM orders WHERE driver_id = d.id AND status = 'completed') * 0.5 as amount,
  NOW() - INTERVAL '5 days' as payment_date,
  'Paiement initial' as notes
FROM drivers d
WHERE d.id IN (SELECT DISTINCT driver_id FROM orders WHERE status = 'completed')
AND NOT EXISTS (SELECT 1 FROM payment_transactions WHERE driver_id = d.id)
LIMIT 2;