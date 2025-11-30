-- Add new fields to products table

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update the RLS policies to include the new columns if needed
-- (This depends on your specific security requirements)