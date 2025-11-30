import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { uploadImageToStorage } from '../lib/storage';
import { Driver, Product, DriverProductPrice, Location } from '../types/database';
import { Plus, Pencil, Trash2, Car, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

export function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    car_type: '',
    car_image_url: '',
    location: '',
    phone_number: '',
  });
  const [carImageFile, setCarImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [productPrices, setProductPrices] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading driver data with service client');
      const [driversRes, productsRes, locationsRes] = await Promise.all([
        supabaseService.from('drivers').select('*').order('created_at', { ascending: false }),
        supabaseService.from('products').select('*'),
        supabaseService.from('locations').select('*').order('name', { ascending: true }),
      ]);

      if (driversRes.error) throw driversRes.error;
      if (productsRes.error) throw productsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setDrivers(driversRes.data || []);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverProductPrices = async (driverId: string) => {
    try {
      const { data, error } = await supabaseService
        .from('driver_product_prices')
        .select('*')
        .eq('driver_id', driverId);

      if (error) throw error;

      const pricesMap: { [key: string]: string } = {};
      data?.forEach((item: DriverProductPrice) => {
        pricesMap[item.product_id] = item.driver_price.toString();
      });
      setProductPrices(pricesMap);
    } catch (error) {
      console.error('Error loading driver product prices:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let driverId: string;
      let carImageUrl = formData.car_image_url;

      // Handle image upload if a new image is selected
      if (carImageFile) {
        setUploading(true);
        try {
          carImageUrl = await uploadImageToStorage(carImageFile, 'driver_cars');
        } catch (uploadError) {
          console.error('Error uploading car image:', uploadError);
          alert(`Error uploading car image: ${(uploadError as Error).message}`);
          return;
        } finally {
          setUploading(false);
        }
      }

      if (editingDriver) {
        const { error } = await supabaseService
          .from('drivers')
          .update({
            full_name: formData.full_name,
            car_type: formData.car_type,
            car_image_url: carImageUrl || null,
            location: formData.location,
            phone_number: formData.phone_number,
          })
          .eq('id', editingDriver.id);

        if (error) throw error;
        driverId = editingDriver.id;

        await supabaseService.from('driver_product_prices').delete().eq('driver_id', driverId);
      } else {
        const { data, error } = await supabaseService
          .from('drivers')
          .insert({
            full_name: formData.full_name,
            car_type: formData.car_type,
            car_image_url: carImageUrl || null,
            location: formData.location,
            phone_number: formData.phone_number,
          })
          .select()
          .single();

        if (error) throw error;
        driverId = data.id;

        // Create a payment record for the new driver
        const { error: paymentError } = await supabaseService
          .from('driver_payments')
          .insert({
            driver_id: driverId,
            pending_amount: 0,
            paid_amount: 0,
          });

        if (paymentError) {
          console.error('Error creating driver payment record:', paymentError);
          // Still continue with the process even if payment record creation fails
        }
      }

      const priceInserts = Object.entries(productPrices)
        .filter(([_, price]) => price && parseFloat(price) > 0)
        .map(([productId, price]) => ({
          driver_id: driverId,
          product_id: productId,
          driver_price: parseFloat(price),
        }));

      if (priceInserts.length > 0) {
        const { error } = await supabaseService.from('driver_product_prices').insert(priceInserts);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingDriver(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving driver:', error);
    }
  };

  const handleEdit = async (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      full_name: driver.full_name,
      car_type: driver.car_type,
      car_image_url: driver.car_image_url || '',
      location: driver.location,
      phone_number: driver.phone_number,
    });
    await loadDriverProductPrices(driver.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      const { error } = await supabaseService.from('drivers').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      car_type: '',
      car_image_url: '',
      location: '',
      phone_number: '',
    });
    setProductPrices({});
  };

  const openNewModal = () => {
    setEditingDriver(null);
    resetForm();
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Drivers</h1>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Driver
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<Driver>
            items={drivers}
            placeholder="Search drivers by name, location, or phone number..."
            searchFields={['full_name', 'location', 'phone_number']}
            onSearch={setFilteredDrivers}
            className="max-w-md"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-slate-100 flex items-center justify-center">
                  {driver.car_image_url ? (
                    <img
                      src={driver.car_image_url}
                      alt={driver.car_type}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Car size={64} className="text-slate-400" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{driver.full_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.status)}`}>
                      {driver.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{driver.car_type}</p>
                  <p className="text-sm text-slate-600 mb-1">{driver.location}</p>
                  <p className="text-sm text-slate-600 mb-4">{driver.phone_number}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(driver)}
                      className="flex-1 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                    <a
                      href={`https://wa.me/${driver.phone_number.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-green-600 hover:bg-green-100 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <span className="text-[16px]">💬</span>
                      WhatsApp
                    </a>
                    <button
                      onClick={() => handleDelete(driver.id)}
                      className="flex-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : filteredDrivers.length === 0 && drivers.length > 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500 text-lg">Not found</p>
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500 text-lg">No drivers found</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingDriver ? 'Edit Driver' : 'Add Driver'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    Car Type
                  </label>
                  <input
                    type="text"
                    value={formData.car_type}
                    onChange={(e) => setFormData({ ...formData, car_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Car Photo
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCarImageFile(e.target.files[0]);
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">Upload car photo (max 5MB)</p>

                {carImageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Selected: {carImageFile.name}</p>
                  </div>
                )}

                {uploading && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-slate-600 mt-1">Uploading...</p>
                  </div>
                )}

                {(formData.car_image_url || editingDriver?.car_image_url) && !carImageFile && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Current car photo:</p>
                    <img
                      src={formData.car_image_url || editingDriver?.car_image_url!}
                      alt="Current car"
                      className="mt-1 max-h-32 object-contain border border-slate-200 rounded"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Prices (Driver Commission)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">
                        {product.name} (Admin: ${product.admin_price})
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Driver price"
                        value={productPrices[product.id] || ''}
                        onChange={(e) =>
                          setProductPrices({ ...productPrices, [product.id]: e.target.value })
                        }
                        className="w-32 px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDriver(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingDriver ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
