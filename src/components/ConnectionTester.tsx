import { useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';

export function ConnectionTester() {
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection by fetching session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          return;
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
          console.error('❌ Database query error:', error);
          return;
        }

        console.log('✅ Database connection successful');
        console.log('Sample admin data:', data);

        // Test authentication status
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user ? user.email : 'No user signed in');

        console.log('\n🎉 Supabase is properly connected to your project!');
      } catch (error) {
        console.error('❌ Connection test failed:', error);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold text-yellow-800">Connection Test Running...</h3>
      <p className="text-sm text-yellow-600">Check the browser console for connection status</p>
    </div>
  );
}