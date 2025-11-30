import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');

// Test with anon key first
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Try a simple request to check if the connection works
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('products') // Try to query a table that should exist
      .select('*')
      .limit(1);

    if (error) {
      console.error('Connection failed with anon key:', error);
    } else {
      console.log('Connection successful with anon key');
      console.log('Sample data:', data);
    }
  } catch (err) {
    console.error('Exception during connection test:', err);
  }
}

testConnection();