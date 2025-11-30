import { useState, useEffect } from 'react';
import { supabase, supabaseService } from '../lib/supabase';
import { Package, Users, Car, ShoppingCart, Coins, TrendingUp, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

interface Stats {
  totalProducts: number;
  totalDrivers: number;
  availableDrivers: number;
  totalClients: number;
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalRevenue: number;
  pendingPayments: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalDrivers: 0,
    availableDrivers: 0,
    totalClients: 0,
    totalOrders: 0,
    newOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('Loading dashboard stats with service client');
      const [products, drivers, clients, orders, payments] = await Promise.all([
        supabaseService.from('products').select('*', { count: 'exact', head: true }),
        supabaseService.from('drivers').select('*'),
        supabaseService.from('clients').select('*', { count: 'exact', head: true }),
        supabaseService.from('orders').select('*'),
        supabaseService.from('driver_payments').select('*'),
      ]);

      const ordersData = orders.data || [];
      const driversData = drivers.data || [];
      const paymentsData = payments.data || [];

      const newOrdersCount = ordersData.filter((o) => o.status === 'new').length;
      const inProgressCount = ordersData.filter((o) => o.status === 'in_progress').length;
      const completedCount = ordersData.filter((o) => o.status === 'completed').length;
      const totalRevenue = ordersData
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
      const pendingPayments = paymentsData.reduce((sum, p) => sum + parseFloat(p.pending_amount), 0);
      const availableDriversCount = driversData.filter((d) => d.status === 'available').length;

      setStats({
        totalProducts: products.count || 0,
        totalDrivers: drivers.count || 0,
        availableDrivers: availableDriversCount,
        totalClients: clients.count || 0,
        totalOrders: ordersData.length,
        newOrders: newOrdersCount,
        inProgressOrders: inProgressCount,
        completedOrders: completedCount,
        totalRevenue: totalRevenue,
        pendingPayments: pendingPayments,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your delivery management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Drivers</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalDrivers}</p>
              <p className="text-xs text-green-600 mt-1">{stats.availableDrivers} available</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Car className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalClients}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Orders Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-slate-600" size={20} />
                <span className="text-slate-700">Total Orders</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{stats.totalOrders}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-yellow-600" size={20} />
                <span className="text-slate-700">New Orders</span>
              </div>
              <span className="text-xl font-bold text-yellow-600">{stats.newOrders}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-blue-600" size={20} />
                <span className="text-slate-700">In Progress</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{stats.inProgressOrders}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-green-600" size={20} />
                <span className="text-slate-700">Completed</span>
              </div>
              <span className="text-xl font-bold text-green-600">{stats.completedOrders}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Financial Overview</h2>
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={24} />
                <span className="text-sm opacity-90">Total Revenue</span>
              </div>
              <p className="text-4xl font-bold">SAR {stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">From completed orders</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Coins size={24} />
                <span className="text-sm opacity-90">Pending Payments</span>
              </div>
              <p className="text-4xl font-bold">SAR {stats.pendingPayments.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">To be paid to drivers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
