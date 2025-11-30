import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { Client, Driver, Product, ScheduledOrder, ScheduledOrderItem, Location } from '../types/database';
import { Plus, Pencil, Trash2, Clock, Search } from 'lucide-react';
import { DateTime } from 'luxon';
import { SearchBar } from '../components/SearchBar';
import { SearchableSelect } from '../components/SearchableSelect';

interface ScheduledOrderWithDetails extends ScheduledOrder {
  client?: Client;
  driver?: Driver;
  items?: Array<{
    product: Product;
    quantity: number;
    admin_price: number;
    driver_price: number;
  }>;
}

export function ScheduledOrders() {
  const [orders, setOrders] = useState<ScheduledOrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ScheduledOrderWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<ScheduledOrderWithDetails | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    driver_id: '',
    location: '',
    scheduled_datetime: new Date().toISOString().slice(0, 16), // Current time + 1 hour default
    products: [] as Array<{ product_id: string; quantity: number }>,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading scheduled order data with service client');

      // Load each resource separately to avoid join issues and handle potential empty tables gracefully
      const [ordersRes, clientsRes, driversRes, productsRes, locationsRes] = await Promise.all([
        supabaseService.from('scheduled_orders').select('*').order('scheduled_datetime', { ascending: true }),
        supabaseService.from('clients').select('*'),
        supabaseService.from('drivers').select('*'),
        supabaseService.from('products').select('*'),
        supabaseService.from('locations').select('*').order('name', { ascending: true }),
      ]);

      // Check for table existence errors and handle them gracefully
      if (ordersRes.error) {
        console.error('Error loading scheduled orders:', ordersRes.error);
        if (ordersRes.error.message.includes('does not exist')) {
          console.warn('scheduled_orders table may not exist yet');
        }
      }
      if (clientsRes.error) {
        console.error('Error loading clients:', clientsRes.error);
        if (clientsRes.error.message.includes('does not exist')) {
          console.warn('clients table may not exist yet');
        }
      }
      if (driversRes.error) {
        console.error('Error loading drivers:', driversRes.error);
        if (driversRes.error.message.includes('does not exist')) {
          console.warn('drivers table may not exist yet');
        }
      }
      if (productsRes.error) {
        console.error('Error loading products:', productsRes.error);
        if (productsRes.error.message.includes('does not exist')) {
          console.warn('products table may not exist yet');
        }
      }
      if (locationsRes.error) {
        console.error('Error loading locations:', locationsRes.error);
        if (locationsRes.error.message.includes('does not exist')) {
          console.warn('locations table may not exist yet');
        }
      }

      // Initialize orders with empty array in case of errors
      let ordersWithItems: ScheduledOrderWithDetails[] = [];
      if (ordersRes.data && ordersRes.data.length > 0) {
        ordersWithItems = await Promise.all(
          (ordersRes.data || []).map(async (order) => {
            const itemsRes = await supabaseService
              .from('scheduled_order_items')
              .select('*, products(*)')
              .eq('scheduled_order_id', order.id);

            if (itemsRes.error) {
              console.error('Error loading scheduled order items:', itemsRes.error);
            }

            const items = itemsRes.data?.map((item: any) => ({
              product: item.products,
              quantity: item.quantity,
              admin_price: item.admin_price,
              driver_price: item.driver_price,
            })) || [];

            // Add client and driver details by looking them up from the loaded data
            const client = clientsRes.data?.find(c => c.id === order.client_id);
            const driver = driversRes.data?.find(d => d.id === order.driver_id);

            return { ...order, items, client, driver };
          })
        );
      }

      setOrders(ordersWithItems);
      setClients(clientsRes.data || []);
      setDrivers(driversRes.data || []);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.products.length === 0) {
      alert('Please add at least one product');
      return;
    }

    try {
      // Calculate totals first
      const driverPricesRes = await supabaseService
        .from('driver_product_prices')
        .select('*')
        .eq('driver_id', formData.driver_id);

      if (driverPricesRes.error) throw driverPricesRes.error;

      const driverPricesMap = new Map<string, number>();
      driverPricesRes.data?.forEach((item) => {
        driverPricesMap.set(item.product_id, item.driver_price);
      });

      let totalAmount = 0;
      let driverAmount = 0;

      const orderItems = formData.products.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) throw new Error('Product not found');

        const driverPrice = driverPricesMap.get(item.product_id) || product.admin_price;
        const itemTotal = product.admin_price * item.quantity;
        const itemDriverTotal = driverPrice * item.quantity;

        totalAmount += itemTotal;
        driverAmount += itemDriverTotal;

        return {
          product_id: item.product_id,
          quantity: item.quantity,
          admin_price: product.admin_price,
          driver_price: driverPrice,
        };
      });

      // Treat the user's input as Saudi Arabia time and convert it properly
      // The user enters time in their local timezone (Saudi Arabia), so we parse it as such
      const scheduledTimeInput = DateTime.fromISO(formData.scheduled_datetime, { zone: 'local' });
      const scheduledTimeInSaudia = scheduledTimeInput.setZone('Asia/Riyadh', { keepLocalTime: true });

      // Create the scheduled order with the time in UTC for proper storage
      const { data: order, error: orderError } = await supabaseService
        .from('scheduled_orders')
        .insert({
          client_id: formData.client_id,
          driver_id: formData.driver_id,
          location: formData.location,
          scheduled_datetime: scheduledTimeInSaudia.toISO(),
          total_amount: totalAmount,
          driver_amount: driverAmount,
          status: 'scheduled',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add the scheduled order items
      const itemsToInsert = orderItems.map((item) => ({
        scheduled_order_id: order.id,
        ...item,
      }));

      const { error: itemsError } = await supabaseService.from('scheduled_order_items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating scheduled order:', error);
      alert('Error creating scheduled order. Please try again.');
    }
  };

  const handleViewOrder = async (order: ScheduledOrderWithDetails) => {
    try {
      const { data, error } = await supabaseService
        .from('scheduled_order_items')
        .select('*, products(*)')
        .eq('scheduled_order_id', order.id);

      if (error) throw error;

      const items = data?.map((item: any) => ({
        product: item.products,
        quantity: item.quantity,
        admin_price: item.admin_price,
        driver_price: item.driver_price,
      })) || [];

      setViewOrder({ ...order, items });
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled order?')) return;

    try {
      const { error } = await supabaseService.from('scheduled_orders').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting scheduled order:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      driver_id: '',
      location: '',
      scheduled_datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // Current time + 1 hour default
      products: [],
    });
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { product_id: '', quantity: 1 }],
    });
  };

  const updateProduct = (index: number, field: string, value: string | number) => {
    const updated = [...formData.products];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, products: updated });
  };

  const removeProduct = (index: number) => {
    const updated = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: updated });
  };

  const formatDateTime = (dateStr: string) => {
    // Format the datetime in Saudi Arabia timezone (UTC+3) using Luxon
    const date = DateTime.fromISO(dateStr).setZone('Asia/Riyadh');
    return date.toFormat('MMM dd, yyyy HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'new':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
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
        <h1 className="text-3xl font-bold text-slate-900">Scheduled Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Schedule Order
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<ScheduledOrderWithDetails>
            items={orders}
            placeholder="Search scheduled orders by client, driver, location or status..."
            searchFields={['id', 'location', 'status']}
            onSearch={setFilteredOrders}
            className="max-w-md"
          />
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Order ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Client</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Driver</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Scheduled Time</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Location</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900 font-mono">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {order.client?.full_name || 'N/A'}
                    {order.client?.phone_number && (
                      <div className="mt-1">
                        <a
                          href={`https://wa.me/${order.client.phone_number.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                        >
                          <span className="text-[14px]">💬</span>
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {order.driver?.full_name || 'N/A'}
                    {order.driver?.phone_number && (
                      <div className="mt-1">
                        <a
                          href={`https://wa.me/${order.driver.phone_number.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                        >
                          <span className="text-[14px]">💬</span>
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {formatDateTime(order.scheduled_datetime)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{order.location}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">${order.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex gap-2">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="text-blue-600 hover:text-blue-800 p-2 inline-flex transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="text-red-600 hover:text-red-800 p-2 inline-flex transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : filteredOrders.length === 0 && orders.length > 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  Not found
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  No scheduled orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Schedule Order</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client</label>
                  <SearchableSelect<Client>
                    items={clients}
                    value={formData.client_id}
                    onChange={(value) => setFormData({ ...formData, client_id: value })}
                    placeholder="Select Client"
                    displayField="full_name"
                    valueField="id"
                    filterFields={['full_name', 'phone_number', 'location']}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Driver</label>
                  <SearchableSelect<Driver>
                    items={drivers.filter(d => d.status === 'available')}
                    value={formData.driver_id}
                    onChange={(value) => setFormData({ ...formData, driver_id: value })}
                    placeholder="Select Driver"
                    displayField="full_name"
                    valueField="id"
                    filterFields={['full_name', 'phone_number', 'location', 'car_type']}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Delivery Location
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
                  Schedule Date & Time (Saudi Arabia Time)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_datetime}
                  onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
                  required
                  min={new Date().toISOString().slice(0, 16)} // Can't schedule in the past
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Products</label>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Product
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.products.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <div key={index} className="flex gap-2 items-center">
                        <SearchableSelect<Product>
                          items={products}
                          value={item.product_id}
                          onChange={(value) => updateProduct(index, 'product_id', value)}
                          placeholder="Select Product"
                          displayField="name"
                          valueField="id"
                          filterFields={['name']}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value))}
                          required
                          className="w-20 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-slate-600">
                          ${(product ? product.admin_price * item.quantity : 0).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
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
                  Schedule Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Scheduled Order Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Client</p>
                  <p className="font-medium text-slate-900">{viewOrder.client?.full_name}</p>
                  <p className="text-sm text-slate-600">{viewOrder.client?.phone_number}</p>
                  {viewOrder.client?.phone_number && (
                    <a
                      href={`https://wa.me/${viewOrder.client.phone_number.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-1"
                    >
                      <span className="text-[14px]">💬</span>
                      WhatsApp Client
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Driver</p>
                  <p className="font-medium text-slate-900">{viewOrder.driver?.full_name}</p>
                  <p className="text-sm text-slate-600">{viewOrder.driver?.phone_number}</p>
                  {viewOrder.driver?.phone_number && (
                    <a
                      href={`https://wa.me/${viewOrder.driver.phone_number.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-1"
                    >
                      <span className="text-[14px]">💬</span>
                      WhatsApp Driver
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Scheduled Time</p>
                  <p className="font-medium text-slate-900">{formatDateTime(viewOrder.scheduled_datetime)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Location</p>
                  <p className="font-medium text-slate-900">{viewOrder.location}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewOrder.status)}`}>
                    {viewOrder.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Products</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Product</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">Admin Price</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">Driver Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewOrder.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-slate-900">{item.product.name}</td>
                          <td className="px-4 py-2 text-sm text-slate-900 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-slate-900 text-right">
                            ${item.admin_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 text-right">
                            ${item.driver_price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <div>
                  <p className="text-sm text-slate-600">Total Amount</p>
                  <p className="text-2xl font-bold text-slate-900">${viewOrder.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Driver Amount</p>
                  <p className="text-2xl font-bold text-blue-600">${viewOrder.driver_amount.toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={() => setViewOrder(null)}
                className="w-full mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}