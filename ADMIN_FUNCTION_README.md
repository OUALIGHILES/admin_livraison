# Admin User Creation Function

## Overview
The seed.sql file now includes a function to create the first admin user with seed data.

## Function Definition

```sql
CREATE OR REPLACE FUNCTION create_first_admin(
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'super_admin'
)
RETURNS TABLE(admin_id UUID, email TEXT, full_name TEXT, role TEXT)
```

## Usage

To create a new admin user, call the function:

```sql
SELECT * FROM create_first_admin('admin@example.com', 'System Administrator', 'super_admin');
```

Or if you want to use the default role (super_admin):

```sql
SELECT * FROM create_first_admin('admin@example.com', 'System Administrator');
```

## Details

- The function generates a random UUID for the admin's ID
- The email, full name, and role are provided as parameters
- The function returns the created admin's information
- The function works with the `admins` table structure defined in the schema

## In Seed Data

The seed script automatically creates a default admin when executed:

```sql
SELECT * FROM create_first_admin('admin@example.com', 'System Administrator', 'super_admin');
```

## Important Notes for Supabase

- In a real Supabase application, you would typically create the auth user first via the Supabase Auth API
- The `id` field in the `admins` table should match the user's UUID in the `auth.users` table
- For seeding purposes, this function creates only the application-level admin record
- Make sure your Supabase RLS (Row Level Security) policies allow the seeding process to insert data