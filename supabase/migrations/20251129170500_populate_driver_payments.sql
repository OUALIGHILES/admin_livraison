-- Populate driver_payments table with initial records for all drivers

INSERT INTO driver_payments (driver_id, pending_amount, paid_amount)
SELECT 
  d.id as driver_id,
  COALESCE((
    SELECT SUM(op.driver_amount) 
    FROM orders op 
    WHERE op.driver_id = d.id 
    AND op.status = 'in_progress'
  ), 0) as pending_amount,
  COALESCE((
    SELECT SUM(op.driver_amount) 
    FROM orders op 
    WHERE op.driver_id = d.id 
    AND op.status = 'completed'
  ), 0) as paid_amount
FROM drivers d
ON CONFLICT (driver_id) DO NOTHING;