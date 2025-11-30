import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase service role key for database operations...');

// Test with service role key for database operations
const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);

// Try to insert directly into admins table using service role (should bypass RLS)
async function testServiceRole() {
  try {
    // Try to insert a test admin record using service role key (which should bypass RLS)
    const { data, error } = await supabaseService
      .from('admins')
      .insert([{
        id: 'test-service-role',
        email: 'test@example.com',
        full_name: 'Test Admin',
        role: 'super_admin'
      }])
      .select();

    if (error) {
      console.error('Service role key failed for database operations:', error);
    } else {
      console.log('Service role key works for database operations');
      console.log('Test admin created:', data);
      
      // Clean up test record
      await supabaseService
        .from('admins')
        .delete()
        .eq('id', 'test-service-role');
    }
  } catch (err) {
    console.error('Exception during service role test:', err);
  }
}

testServiceRole();