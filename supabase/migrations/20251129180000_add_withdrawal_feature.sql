-- Add withdrawal functionality to payment_transactions table

-- Create a new table for withdrawals if it doesn't exist
CREATE TABLE IF NOT EXISTS driver_withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES drivers(id),
  amount DECIMAL(10,2) NOT NULL,
  withdrawal_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policy for withdrawals if not exists
ALTER TABLE driver_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage driver withdrawals" ON driver_withdrawals
  FOR ALL USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR
    (SELECT auth.uid()) IN (
      SELECT id FROM admins WHERE role = 'sub_admin'
    )
  );