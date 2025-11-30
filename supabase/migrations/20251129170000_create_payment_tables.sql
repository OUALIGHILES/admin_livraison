-- Ensure payment-related tables exist

-- Create driver_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS driver_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES drivers(id),
  pending_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES drivers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for payment tables
ALTER TABLE driver_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for admins to manage payment data
CREATE POLICY "Admins can manage driver payments" ON driver_payments
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );

CREATE POLICY "Admins can manage payment transactions" ON payment_transactions
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );