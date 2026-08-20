import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import { getSyncQueue, syncQueue, getPendingOrders } from './db';
import { translations, type Lang } from './i18n';
import type {
  Category, MenuItem, Modifier, RestaurantTable, Order, OrderItem,
  Customer, Driver, DeliveryZone, Staff, Shift, Printer, Settings,
} from './types';

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tStatus: (group: 'orderStatus' | 'deliveryStatus', key: string) => string;
  isOnline: boolean;
  pendingSyncCount: number;
  sync: () => Promise<void>;
  syncing: boolean;

  settings: Settings | null;
  categories: Category[];
  menuItems: MenuItem[];
  modifiers: Modifier[];
  tables: RestaurantTable[];
  orders: Order[];
  orderItems: OrderItem[];
  customers: Customer[];
  drivers: Driver[];
  zones: DeliveryZone[];
  staff: Staff[];
  shifts: Shift[];
  printers: Printer[];

  refreshAll: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshTables: () => Promise<void>;
  refreshMenu: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);

  const t = useCallback((key: string) => {
    const dict = translations[lang] as Record<string, unknown>;
    const val = dict[key];
    return typeof val === 'string' ? val : key;
  }, [lang]);

  const tStatus = useCallback((group: 'orderStatus' | 'deliveryStatus', key: string) => {
    const dict = translations[lang] as unknown as Record<string, Record<string, string>>;
    const g = dict[group];
    return g && g[key] ? g[key] : key;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('pos_lang', l);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('pos_lang') as Lang | null;
    const initLang = saved || 'ar';
    setLang(initLang);
  }, [setLang]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    setPendingSyncCount(getSyncQueue().length + getPendingOrders().length);
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncQueue();
      setPendingSyncCount(getSyncQueue().length + getPendingOrders().length);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  const refreshAll = useCallback(async () => {
    try {
      const [s, c, m, mod, tbl, o, oi, cust, d, z, st, sh, p] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('menu_items').select('*').order('sort_order'),
        supabase.from('modifiers').select('*'),
        supabase.from('restaurant_tables').select('*').order('sort_order'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('order_items').select('*'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*'),
        supabase.from('delivery_zones').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('shifts').select('*').order('opened_at', { ascending: false }),
        supabase.from('printers').select('*'),
      ]);

      if (s.data) {
        setSettings(s.data as Settings);
        if ((s.data as Settings).language) {
          const saved = localStorage.getItem('pos_lang') as Lang | null;
          if (!saved) setLang((s.data as Settings).language as Lang);
        }
      }
      if (c.data) setCategories(c.data as Category[]);
      if (m.data) setMenuItems(m.data as MenuItem[]);
      if (mod.data) setModifiers(mod.data as Modifier[]);
      if (tbl.data) setTables(tbl.data as RestaurantTable[]);
      if (o.data) setOrders(o.data as Order[]);
      if (oi.data) setOrderItems(oi.data as OrderItem[]);
      if (cust.data) setCustomers(cust.data as Customer[]);
      if (d.data) setDrivers(d.data as Driver[]);
      if (z.data) setZones(z.data as DeliveryZone[]);
      if (st.data) setStaff(st.data as Staff[]);
      if (sh.data) setShifts(sh.data as Shift[]);
      if (p.data) setPrinters(p.data as Printer[]);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, [setLang]);

  const refreshOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setOrders(data as Order[]);
    const { data: oiData } = await supabase.from('order_items').select('*');
    if (oiData) setOrderItems(oiData as OrderItem[]);
  }, []);

  const refreshTables = useCallback(async () => {
    const { data } = await supabase.from('restaurant_tables').select('*').order('sort_order');
    if (data) setTables(data as RestaurantTable[]);
  }, []);

  const refreshMenu = useCallback(async () => {
    const { data: c } = await supabase.from('categories').select('*').order('sort_order');
    if (c) setCategories(c as Category[]);
    const { data: m } = await supabase.from('menu_items').select('*').order('sort_order');
    if (m) setMenuItems(m as MenuItem[]);
    const { data: mod } = await supabase.from('modifiers').select('*');
    if (mod) setModifiers(mod as Modifier[]);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const value: AppContextValue = {
    lang, setLang, t, tStatus, isOnline, pendingSyncCount, sync, syncing,
    settings, categories, menuItems, modifiers, tables, orders, orderItems,
    customers, drivers, zones, staff, shifts, printers,
    refreshAll, refreshOrders, refreshTables, refreshMenu,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
