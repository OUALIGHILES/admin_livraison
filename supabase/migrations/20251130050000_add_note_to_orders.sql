-- Add note column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT;

-- Add note column to scheduled_orders table
ALTER TABLE scheduled_orders ADD COLUMN IF NOT EXISTS note TEXT;

