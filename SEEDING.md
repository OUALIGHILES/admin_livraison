# Database Seeding Instructions

To seed your Supabase database with initial data, follow these steps:

## Prerequisites
1. Make sure you have created a user in Supabase Auth (Authentication → Users)
2. Get the user's UUID from the Auth users table in your Supabase dashboard
3. Update the seed.sql file with your actual user UUID

## Option 1: Using Supabase Dashboard (Recommended if CLI is not available)
1. Go to your Supabase dashboard
2. Navigate to Database → SQL Editor
3. Open the `seed.sql` file and copy its content
4. Paste it into the SQL Editor and execute
5. Remember to update the admin user UUID before running the script

## Option 2: Using Supabase CLI (if available)
If you have the Supabase CLI installed, you can run:
```bash
supabase db seed --file seed.sql
```

## Admin User Setup
There are now two ways to set up the admin user:

### Method 1: Using the new create_first_admin function (Recommended for seeding only)
The seed.sql file now includes a function that simplifies admin creation:
1. The `create_first_admin` function is automatically run in the seed script
2. It creates an admin with the details: email='admin@example.com', full_name='System Administrator', role='super_admin'
3. A random UUID is generated for the admin ID

### Method 2: Manual setup (Traditional approach)
1. Create a user in Supabase Authentication (Authentication → Users → New User)
2. Get the User ID (UUID) from the created user
3. In the seed.sql file, uncomment and edit this line:
   ```sql
   INSERT INTO admins (id, email, full_name, role) VALUES
     ('your-actual-uuid-here', 'admin@example.com', 'Admin User', 'super_admin');
   ```
4. Replace 'your-actual-uuid-here' with the actual UUID from step 2

## What the Seed Includes
- Function to create the first admin user
- Sample products
- Sample drivers
- Sample clients
- Driver product pricing
- Sample orders
- Order items (simplified approach to avoid complex queries)
- Driver payments
- Payment transactions

After running the seed script, your database will have initial data to work with, and you can use the credentials you created for the admin user to log in to your application.