import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { Order, Client, Driver, Product, DriverProductPrice, Location, ScheduledOrder } from '../types/database';
import { Plus, Eye, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { SearchableSelect } from '../components/SearchableSelect';

interface OrderWithDetails extends Order {
  client?: Client;
  driver?: Driver;
  items?: Array<{
    product: Product;
    quantity: number;
    driver_price: number;
  }>;
}

export function Orders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<OrderWithDetails | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    driver_id: '',
    location: '',
    products: [] as Array<{ product_id: string; quantity: number }>,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Check for scheduled orders that should become active
  useEffect(() => {
    const checkScheduledOrders = async () => {
      try {
        const { data: scheduledOrders, error } = await supabaseService
          .from('scheduled_orders')
          .select('*')
          .eq('status', 'scheduled')
          .lte('scheduled_datetime', new Date().toISOString());

        if (error) throw error;

        // Process each scheduled order that has reached its scheduled time
        for (const scheduledOrder of scheduledOrders) {
          // Create the actual order
          const { data: actualOrder, error: orderError } = await supabaseService
            .from('orders')
            .insert({
              client_id: scheduledOrder.client_id,
              driver_id: scheduledOrder.driver_id,
              location: scheduledOrder.location,
              total_amount: scheduledOrder.total_amount,
              driver_amount: scheduledOrder.driver_amount,
              status: 'new',
            })
            .select()
            .single();

          if (orderError) throw orderError;

          // Get the scheduled order items
          const { data: scheduledItems, error: itemsError } = await supabaseService
            .from('scheduled_order_items')
            .select('*')
            .eq('scheduled_order_id', scheduledOrder.id);

          if (itemsError) throw itemsError;

          // Insert the order items for the actual order
          const itemsToInsert = scheduledItems.map(item => ({
            order_id: actualOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            admin_price: item.admin_price,
            driver_price: item.driver_price,
          }));

          const { error: insertItemsError } = await supabaseService
            .from('order_items')
            .insert(itemsToInsert);

          if (insertItemsError) throw insertItemsError;

          // Update the scheduled order to mark it as processed
          await supabaseService
            .from('scheduled_orders')
            .update({ status: 'active', actual_order_ref: actualOrder.id })
            .eq('id', scheduledOrder.id);
        }
      } catch (error) {
        console.error('Error processing scheduled orders:', error);
      }
    };

    // Check every 30 seconds for scheduled orders that should activate
    const interval = setInterval(checkScheduledOrders, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading order data with service client');
      const [ordersRes, clientsRes, driversRes, productsRes, locationsRes] = await Promise.all([
        supabaseService.from('orders').select('*, clients(*), drivers(*)').order('created_at', { ascending: false }),
        supabaseService.from('clients').select('*'),
        supabaseService.from('drivers').select('*'),
        supabaseService.from('products').select('*'),
        supabaseService.from('locations').select('*').order('name', { ascending: true }),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (driversRes.error) throw driversRes.error;
      if (productsRes.error) throw productsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setOrders(ordersRes.data || []);
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
      const driverPricesRes = await supabaseService
        .from('driver_product_prices')
        .select('*')
        .eq('driver_id', formData.driver_id);

      if (driverPricesRes.error) throw driverPricesRes.error;

      const driverPricesMap = new Map<string, number>();
      driverPricesRes.data?.forEach((item: DriverProductPrice) => {
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

      const { data: order, error: orderError } = await supabaseService
        .from('orders')
        .insert({
          client_id: formData.client_id,
          driver_id: formData.driver_id,
          location: formData.location,
          total_amount: totalAmount,
          driver_amount: driverAmount,
          status: 'new',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        ...item,
      }));

      const { error: itemsError } = await supabaseService.from('order_items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order. Please try again.');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabaseService
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleViewOrder = async (order: OrderWithDetails) => {
    try {
      const { data, error } = await supabaseService
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', order.id);

      if (error) throw error;

      const items = data?.map((item: any) => ({
        product: item.products,
        quantity: item.quantity,
        driver_price: item.driver_price,
      })) || [];

      setViewOrder({ ...order, items });
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      driver_id: '',
      location: '',
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

  const calculateOrderTotal = () => {
    return formData.products.reduce((total, item) => {
      const product = products.find(p => p.id === item.product_id);
      return total + (product ? product.admin_price * item.quantity : 0);
    }, 0);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

    try {
      // First, delete the associated order items
      const { error: itemsError } = await supabaseService
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Then, delete the order itself
      const { error: orderError } = await supabaseService
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;
      loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800';
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
        <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Order
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<OrderWithDetails>
            items={orders}
            placeholder="Search orders by client, driver, location or status..."
            searchFields={['id', 'location', 'status', 'clients.full_name', 'drivers.full_name', 'clients.phone_number', 'drivers.phone_number']}
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Location</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(filteredOrders.length > 0 ? filteredOrders : orders).map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-900 font-mono">
                  {order.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {order.clients?.full_name || 'N/A'}
                  {order.clients?.phone_number && (
                    <div className="mt-1">
                      <a
                        href={`https://wa.me/${order.clients.phone_number.replace(/[^0-9]/g, '')}`}
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
                  {order.drivers?.full_name || 'N/A'}
                  {order.drivers?.phone_number && (
                    <div className="mt-1">
                      <a
                        href={`https://wa.me/${order.drivers.phone_number.replace(/[^0-9]/g, '')}`}
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
                <td className="px-6 py-4 text-sm text-slate-900">{order.location}</td>
                <td className="px-6 py-4 text-sm text-slate-900">${order.total_amount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} border-0 cursor-pointer`}
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleViewOrder(order)}
                    className="text-blue-600 hover:text-blue-800 p-2 inline-flex transition-colors mr-2"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-600 hover:text-red-800 p-2 inline-flex transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Create Order</h2>
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

                {/* Display order total */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">Order Total:</span>
                    <span className="text-lg font-bold text-slate-900">
                      ${calculateOrderTotal().toFixed(2)}
                    </span>
                  </div>
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
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Order Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Client</p>
                  <p className="font-medium text-slate-900">{viewOrder.clients?.full_name}</p>
                  <p className="text-sm text-slate-600">{viewOrder.clients?.phone_number}</p>
                  <a
                    href={`https://wa.me/${viewOrder.clients?.phone_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-1"
                  >
                    <span className="text-[14px]">💬</span>
                    WhatsApp Client
                  </a>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Driver</p>
                  <p className="font-medium text-slate-900">{viewOrder.drivers?.full_name}</p>
                  <p className="text-sm text-slate-600">{viewOrder.drivers?.phone_number}</p>
                  <a
                    href={`https://wa.me/${viewOrder.drivers?.phone_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-1"
                  >
                    <span className="text-[14px]">💬</span>
                    WhatsApp Driver
                  </a>
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
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">Driver Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewOrder.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-slate-900">{item.product.name}</td>
                          <td className="px-4 py-2 text-sm text-slate-900 text-center">{item.quantity}</td>
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
