-- Update the scheduled orders processing function to use Saudi Arabia timezone

-- Drop the existing function
DROP FUNCTION IF EXISTS process_scheduled_orders();

-- Create the function with Saudi Arabia timezone support
CREATE OR REPLACE FUNCTION process_scheduled_orders()
RETURNS VOID AS $$
DECLARE
  rec RECORD;
  new_order_id UUID;
  current_time_saudi TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the current time in UTC and then convert to Saudi Arabia timezone (UTC+3)
  SELECT NOW() AT TIME ZONE 'UTC' + INTERVAL '3 hours' INTO current_time_saudi;

  -- Log the current Saudi time for debugging
  RAISE NOTICE 'Current Saudi Time: %', current_time_saudi;

  -- Loop through all scheduled orders that have reached their scheduled time
  FOR rec IN
    SELECT * FROM scheduled_orders
    WHERE status = 'scheduled'
    AND scheduled_datetime <= current_time_saudi
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

    -- Log that the order was processed
    RAISE NOTICE 'Processed scheduled order: % at %', rec.id, rec.scheduled_datetime;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Reschedule the cron job with the updated function
SELECT cron.unschedule('process-scheduled-orders');
SELECT cron.schedule(
    'process-scheduled-orders',
    '* * * * *',  -- Run every minute
    $$SELECT process_scheduled_orders();$$
);