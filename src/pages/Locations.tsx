import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { Location } from '../types/database';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

export function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      console.log('Loading locations with service client');
      const { data, error } = await supabaseService
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading locations:', error);
        throw error;
      }
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('Attempting to save location with service client');
      if (editingLocation) {
        const { error } = await supabaseService
          .from('locations')
          .update({
            name: formData.name,
            address: formData.address || null,
          })
          .eq('id', editingLocation.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        console.log('Location updated successfully');
      } else {
        const { error } = await supabaseService.from('locations').insert([{
          name: formData.name,
          address: formData.address || null,
        }]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        console.log('Location created successfully');
      }

      setShowModal(false);
      setEditingLocation(null);
      setFormData({ name: '', address: '' });
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      alert(`Error saving location: ${(error as any).message || 'Unknown error'}`);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabaseService.from('locations').delete().eq('id', id);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const openNewModal = () => {
    setEditingLocation(null);
    setFormData({ name: '', address: '' });
    setShowModal(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Locations</h1>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Location
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<Location>
            items={locations}
            placeholder="Search locations by name or address..."
            searchFields={['name', 'address']}
            onSearch={setFilteredLocations}
            className="max-w-md"
          />
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Location Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Address</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Created</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(filteredLocations.length > 0 ? filteredLocations : locations).map((location) => (
              <tr key={location.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-900">{location.name}</td>
                <td className="px-6 py-4 text-sm text-slate-900">{location.address || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(location.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleEdit(location)}
                    className="text-blue-600 hover:text-blue-800 p-2 inline-flex transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="text-red-600 hover:text-red-800 p-2 inline-flex transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLocation(null);
                    setFormData({ name: '', address: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingLocation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}