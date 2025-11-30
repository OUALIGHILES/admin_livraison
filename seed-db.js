
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Try to load environment variables from .env file
let dotenv;
try {
  dotenv = await import('dotenv');
  dotenv.config();
  console.log('Environment variables loaded from .env file');
} catch (error) {
  console.log('dotenv not found, proceeding without it. Make sure to set environment variables.');
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Required for user management

console.log('Supabase URL length:', supabaseUrl ? supabaseUrl.length : 'Not provided');
console.log('Anon Key length:', supabaseAnonKey ? supabaseAnonKey.length : 'Not provided');
console.log('Service Role Key length:', supabaseServiceRoleKey ? supabaseServiceRoleKey.length : 'Not provided');

// Check if keys look valid (basic validation)
const isValidUrl = supabaseUrl && supabaseUrl !== 'your_supabase_url_here' && supabaseUrl.startsWith('https://') && supabaseUrl.includes('supabase.co');
const isValidAnonKey = supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key_here' && supabaseAnonKey.length > 10;
const isValidServiceRoleKey = supabaseServiceRoleKey && supabaseServiceRoleKey.length > 10;

console.log('URL is valid format:', isValidUrl);
console.log('Anon key is valid format:', isValidAnonKey);
console.log('Service role key is valid format:', isValidServiceRoleKey);

// Create two clients: one with anon key for general operations, one with service role for admin tasks
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Service role client for admin operations (user management)
const supabaseServiceRole = supabaseServiceRoleKey && isValidServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // First, create an auth user for the super admin
    console.log('Creating super admin user in Auth...');
    const adminAuthResult = await createAuthUser(
      'admin@example.com',
      'AdminPassword123!', // In production, this should be a properly generated secure password
      'System Administrator'
    );

    if (adminAuthResult.userId) {
      console.log('Super admin auth user created with ID:', adminAuthResult.userId);

      // Now create the corresponding admin record in the application table
      console.log('Creating super admin record in application table...');
      await createAdminRecord(
        adminAuthResult.userId,
        'admin@example.com',
        'System Administrator',
        'super_admin'
      );
    } else {
      console.log('Auth user creation failed:', adminAuthResult.error);
      console.log('Creating admin record with mock UUID (for demo only)...');
      // Fallback: create admin with generated UUID (not linked to actual auth user)
      // Using a generated UUID for demo purposes, but in real scenarios you'd use the actual auth user ID
      await createAdminRecord(
        randomUUID(),
        'admin@example.com',
        'System Administrator',
        'super_admin'
      );
    }

    // Add mockup products
    console.log('Adding mockup products...');
    await addMockupProducts();

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
}

// Function to create an auth user (requires service role key to work properly)
async function createAuthUser(email, password, fullName) {
  // Note: Creating users programmatically requires SERVICE_ROLE_KEY, not the anon key
  // This is more privileged and should be used cautiously, typically only in server environments
  if (!supabaseServiceRole) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not provided or invalid. Cannot create auth user. Please create user manually in Supabase dashboard.');
    return { userId: null, error: 'Service role key not provided or invalid' };
  }

  try {
    const { data, error } = await supabaseServiceRole.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
      },
      email_confirm: true, // Skip email confirmation for seeding
    });

    if (error) {
      console.error('Error creating auth user:', error);
      return { userId: null, error: error.message };
    }

    return { userId: data.user.id, error: null };
  } catch (error) {
    console.error('Exception creating auth user:', error);
    return { userId: null, error: error.message };
  }
}

// Function to create the admin record in the application table
async function createAdminRecord(userId, email, fullName, role) {
  // Use service role client if available to bypass RLS
  const clientToUse = supabaseServiceRole || supabase;

  const { data, error } = await clientToUse
    .from('admins')
    .insert([{
      id: userId,
      email,
      full_name: fullName,
      role
    }])
    .select();

  if (error) {
    console.error('Error creating admin record:', error);
    throw error;
  } else {
    console.log('Super admin record created successfully:', data);
  }
}

async function addMockupProducts() {
  const products = [
    { name: 'Pizza Margherita', admin_price: 12.99 },
    { name: 'Burger Classique', admin_price: 10.99 },
    { name: 'Salade César', admin_price: 8.99 },
    { name: 'Sushi Assorti', admin_price: 18.99 },
    { name: 'Poulet Grillé', admin_price: 14.99 },
    { name: 'Tacos Mexican', admin_price: 9.99 },
    { name: 'Pasta Carbonara', admin_price: 13.99 },
    { name: 'Salmon Grillé', admin_price: 19.99 },
    { name: 'Salade Niçoise', admin_price: 11.99 },
    { name: 'Risotto aux Champignons', admin_price: 16.99 },
  ];

  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select();

  if (error) {
    console.error('Error adding products:', error);
    throw error;
  } else {
    console.log(`Added ${data?.length || 0} products successfully`);
  }
}

// Helper function to determine if this script is being run directly
function isMain() {
  if (typeof process !== 'undefined' && process.argv) {
    // Check if the current file is the main module being executed
    const currentFile = new URL(import.meta.url).pathname.split('/').pop();
    const mainFile = process.argv[1] ? process.argv[1].split('\\').pop().split('/').pop() : null;
    return currentFile === mainFile;
  }
  return false;
}

// Run the seeding function when the script is executed directly
if (isMain()) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };