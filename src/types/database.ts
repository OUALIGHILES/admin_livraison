export interface Location {
  id: string;
  name: string;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  admin_price: number;
  profit_amount?: number | null;
  note?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  car_type: string;
  car_image_url: string | null;
  location: string;
  phone_number: string;
  status: 'available' | 'in_delivery' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface DriverProductPrice {
  id: string;
  driver_id: string;
  product_id: string;
  driver_price: number;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  location: string;
  phone_number: string;
  house_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  client_id: string;
  driver_id: string | null;
  location: string;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  driver_amount: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  admin_price: number;
  driver_price: number;
  created_at: string;
}

export interface DriverPayment {
  id: string;
  driver_id: string;
  pending_amount: number;
  paid_amount: number;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  driver_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface DriverWithdrawal {
  id: string;
  driver_id: string;
  amount: number;
  withdrawal_date: string;
  notes: string | null;
  created_at: string;
}

export interface ScheduledOrderItem {
  id: string;
  scheduled_order_id: string;
  product_id: string;
  quantity: number;
  admin_price: number;
  driver_price: number;
  created_at: string;
}

export interface ScheduledOrder {
  id: string;
  client_id: string;
  driver_id?: string | null;
  location: string;
  total_amount: number;
  driver_amount: number;
  status: 'scheduled' | 'active' | 'new' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_datetime: string;
  actual_order_ref?: string | null;
  created_at: string;
  updated_at: string;
  items?: ScheduledOrderItem[];
  client?: Client;
  driver?: Driver;
}

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'sub_admin';
  created_at: string;
}
