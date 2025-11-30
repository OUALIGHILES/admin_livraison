import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { Admin } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Shield, ShieldAlert, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

export function Settings() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'sub_admin' as 'super_admin' | 'sub_admin',
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      // Use service role client to bypass RLS that might cause recursion
      const { data, error } = await supabaseService
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('Starting admin creation process...');
      console.log('Service client ready:', !!supabaseService.auth.admin);

      // Check if service client has admin privileges
      if (!supabaseService.auth.admin) {
        alert('Service role is not properly configured. Please make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment.');
        return;
      }

      // Try to create user with email confirmation via service role
      const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Automatically confirm the email
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      console.log('User created successfully:', authData);

      if (authData.user) {
        // Create the admin profile record
        const { error: profileError } = await supabaseService.from('admins').insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        });

        if (profileError) {
          console.error('Profile error:', profileError);
          // If profile creation fails, delete the auth user to clean up
          await supabaseService.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }

        // Verify the admin profile was created successfully
        const { data: verifyData, error: verifyError } = await supabaseService
          .from('admins')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (verifyError || !verifyData) {
          console.error('Verification error:', verifyError);
          // Clean up by deleting the auth user since profile creation failed
          await supabaseService.auth.admin.deleteUser(authData.user.id);
          throw new Error('Admin profile creation verification failed');
        }

        console.log('Admin profile created and verified:', verifyData);
      }

      setShowModal(false);
      setFormData({ email: '', password: '', full_name: '', role: 'sub_admin' });
      loadAdmins();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      // More specific error handling
      let errorMessage = 'Please try again.';
      if (error.code) {
        if (error.code === 'not_admin') {
          errorMessage = 'Service role key is not properly configured. Please ensure SUPABASE_SERVICE_ROLE_KEY is set with a proper service role key.';
        } else if (error.code === 'user_already_exists') {
          errorMessage = 'A user with this email already exists.';
        } else if (error.code === 'weak_password') {
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
        } else {
          errorMessage = `Error: ${error.code || error.message}`;
        }
      } else {
        errorMessage = error.message || error.error_description || errorMessage;
      }
      alert(`Error creating admin: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    try {
      // Use service role client to bypass RLS recursion
      const { error } = await supabaseService.from('admins').delete().eq('id', id);
      if (error) throw error;
      loadAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
    }
  };

  const isSuperAdmin = admin?.role === 'super_admin';

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        {isSuperAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Admin
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            You need Super Admin privileges to manage admins.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<Admin>
            items={admins}
            placeholder="Search admins by name or email..."
            searchFields={['full_name', 'email']}
            onSearch={setFilteredAdmins}
            className="max-w-md"
          />
        </div>
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Admin Users</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {(filteredAdmins.length > 0 ? filteredAdmins : admins).map((adminUser) => (
              <div
                key={adminUser.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    {adminUser.role === 'super_admin' ? (
                      <Shield className="text-blue-600" size={24} />
                    ) : (
                      <ShieldAlert className="text-slate-600" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{adminUser.full_name}</h3>
                    <p className="text-sm text-slate-600">{adminUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      adminUser.role === 'super_admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {adminUser.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                  </span>
                  {isSuperAdmin && adminUser.id !== admin?.id && (
                    <button
                      onClick={() => handleDelete(adminUser.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Add Admin User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as 'super_admin' | 'sub_admin' })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sub_admin">Sub Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ email: '', password: '', full_name: '', role: 'sub_admin' });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
