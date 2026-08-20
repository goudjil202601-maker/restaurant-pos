export type Channel = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'open' | 'sent_to_kitchen' | 'ready' | 'paid' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'other';
export type TableStatus = 'free' | 'occupied' | 'reserved';
export type StaffRole = 'manager' | 'cashier' | 'waiter';
export type PrinterConnection = 'network' | 'usb' | 'bluetooth';
export type PrinterStation = 'cashier' | 'kitchen' | 'bar' | 'label';
export type ShiftStatus = 'open' | 'closed';
export type DeliveryStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered';
export type ItemStation = 'kitchen' | 'bar';

export interface Category {
  id: string;
  name_ar: string;
  name_fr: string;
  sort_order: number;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name_ar: string;
  name_fr: string;
  price: number;
  available: boolean;
  sort_order: number;
  station: string;
  created_at?: string;
}

export interface Modifier {
  id: string;
  menu_item_id: string;
  name_ar: string;
  name_fr: string;
  price: number;
  is_note: boolean;
}

export interface RestaurantTable {
  id: string;
  label: string;
  seats: number;
  zone: string | null;
  status: TableStatus;
  current_order_id: string | null;
  occupied_at: string | null;
  sort_order: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  zone_id: string | null;
  total_orders: number;
  total_spent: number;
  created_at?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name_ar: string;
  name_fr: string;
  delivery_fee: number;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  pin: string | null;
  active: boolean;
}

export interface Shift {
  id: string;
  shift_number: number;
  staff_id: string | null;
  staff_name: string | null;
  opening_cash: number;
  closing_cash: number;
  expected_cash: number;
  cash_difference: number;
  total_sales: number;
  status: ShiftStatus;
  opened_at: string;
  closed_at: string | null;
}

export interface OrderModifiersJSON {
  name_ar: string;
  name_fr: string;
  price: number;
  is_note: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_ar: string;
  name_fr: string;
  unit_price: number;
  quantity: number;
  modifiers_json: OrderModifiersJSON[];
  line_total: number;
  printed: boolean;
  voided: boolean;
}

export interface Order {
  id: string;
  order_number: number;
  channel: Channel;
  status: OrderStatus;
  table_id: string | null;
  table_label: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  driver_id: string | null;
  driver_name: string | null;
  staff_id: string | null;
  staff_name: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  shift_id: string | null;
  sent_to_kitchen_at: string | null;
  paid_at: string | null;
  eta_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface Printer {
  id: string;
  name: string;
  connection_type: PrinterConnection;
  ip_address: string | null;
  port: number;
  usb_vendor_id: string | null;
  usb_product_id: string | null;
  bluetooth_id: string | null;
  paper_width: number;
  auto_cutter: boolean;
  station: PrinterStation;
  active: boolean;
}

export interface Settings {
  id: number;
  restaurant_name: string;
  logo_url: string | null;
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  language: 'ar' | 'fr';
  phone: string | null;
  address: string | null;
  footer_receipt: string | null;
}

export interface VoidedItem {
  id: string;
  order_id: string;
  order_item_id: string | null;
  name_ar: string | null;
  reason: string | null;
  voided_by: string | null;
  voided_at: string;
}
