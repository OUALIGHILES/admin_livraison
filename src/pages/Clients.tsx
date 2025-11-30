import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { uploadImageToStorage } from '../lib/storage';
import { Client, Location } from '../types/database';
import { Plus, Pencil, Trash2, Home, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    location: '',
    phone_number: '',
    house_image_url: '',
  });
  const [houseImageFile, setHouseImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading clients and locations with service client');
      const [clientsRes, locationsRes] = await Promise.all([
        supabaseService.from('clients').select('*').order('created_at', { ascending: false }),
        supabaseService.from('locations').select('*').order('name', { ascending: true }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setClients(clientsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let houseImageUrl = formData.house_image_url;

      // Handle image upload if a new image is selected
      if (houseImageFile) {
        setUploading(true);
        try {
          houseImageUrl = await uploadImageToStorage(houseImageFile, 'client_houses');
        } catch (uploadError) {
          console.error('Error uploading house image:', uploadError);
          alert(`Error uploading house image: ${(uploadError as Error).message}`);
          return;
        } finally {
          setUploading(false);
        }
      }

      if (editingClient) {
        const { error } = await supabaseService
          .from('clients')
          .update({
            full_name: formData.full_name,
            location: formData.location,
            phone_number: formData.phone_number,
            house_image_url: houseImageUrl || null,
          })
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseService.from('clients').insert({
          full_name: formData.full_name,
          location: formData.location,
          phone_number: formData.phone_number,
          house_image_url: houseImageUrl || null,
        });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingClient(null);
      setFormData({ full_name: '', location: '', phone_number: '', house_image_url: '' });
      setHouseImageFile(null);
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      location: client.location,
      phone_number: client.phone_number,
      house_image_url: client.house_image_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabaseService.from('clients').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const openNewModal = () => {
    setEditingClient(null);
    setFormData({ full_name: '', location: '', phone_number: '', house_image_url: '' });
    setShowModal(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Client
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<Client>
            items={clients}
            placeholder="Search clients by name, location, or phone number..."
            searchFields={['full_name', 'location', 'phone_number']}
            onSearch={setFilteredClients}
            className="max-w-md"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-slate-100 flex items-center justify-center">
                  {client.house_image_url ? (
                    <img
                      src={client.house_image_url}
                      alt="House"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Home size={64} className="text-slate-400" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{client.full_name}</h3>
                  <p className="text-sm text-slate-600 mb-1">{client.location}</p>
                  <p className="text-sm text-slate-600 mb-4">{client.phone_number}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="flex-1 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                    <a
                      href={`https://wa.me/${client.phone_number.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-green-600 hover:bg-green-100 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <span className="text-[16px]">💬</span>
                      WhatsApp
                    </a>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="flex-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : filteredClients.length === 0 && clients.length > 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500 text-lg">Not found</p>
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500 text-lg">No clients found</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingClient ? 'Edit Client' : 'Add Client'}
            </h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  House Photo
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setHouseImageFile(e.target.files[0]);
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">Upload house photo (max 5MB)</p>

                {houseImageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Selected: {houseImageFile.name}</p>
                  </div>
                )}

                {uploading && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-slate-600 mt-1">Uploading...</p>
                  </div>
                )}

                {(formData.house_image_url || editingClient?.house_image_url) && !houseImageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Current house photo:</p>
                    <img
                      src={formData.house_image_url || editingClient?.house_image_url!}
                      alt="Current house"
                      className="mt-1 max-h-32 object-contain border border-slate-200 rounded"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                    setFormData({ full_name: '', location: '', phone_number: '', house_image_url: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingClient ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
