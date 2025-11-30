import { supabase, supabaseService } from './lib/supabase';

async function testConnection() {
  try {
    // Test basic connection by fetching a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return false;
    }

    console.log('✅ Authentication connection successful');
    console.log('Session exists:', !!session);

    // Test database connection by attempting a simple query
    // Use service role client to bypass RLS that might cause recursion
    const { data, error } = await supabaseService
      .from('admins') // Test with the admins table
      .select('id, email')
      .limit(1);

    if (error) {
      console.error('Database query error:', error);
      return false;
    }

    console.log('✅ Database connection successful');
    console.log('Sample admin data:', data);

    // Test authentication status
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user ? user.email : 'No user signed in');

    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Supabase is properly connected to your project!');
    } else {
      console.log('\n❌ There are issues with the Supabase connection');
    }
  });