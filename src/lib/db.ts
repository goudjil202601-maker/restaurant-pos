import { supabase } from './supabase';
import type {
  Category, MenuItem, Modifier, RestaurantTable, Order, OrderItem,
  Customer, Driver, DeliveryZone, Staff, Shift, Printer, Settings, VoidedItem,
} from './types';

const SYNC_QUEUE_KEY = 'pos_sync_queue';
const PENDING_ORDERS_KEY = 'pos_pending_orders';

export interface SyncQueueEntry {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  created_at: string;
}

export function getSyncQueue(): SyncQueueEntry[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToSyncQueue(entry: Omit<SyncQueueEntry, 'id' | 'created_at'>): void {
  const queue = getSyncQueue();
  queue.push({ ...entry, id: crypto.randomUUID(), created_at: new Date().toISOString() });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

export function getPendingOrders(): Order[] {
  try {
    const raw = localStorage.getItem(PENDING_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setPendingOrders(orders: Order[]): void {
  localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(orders));
}

export async function syncQueue(): Promise<{ success: boolean; error?: string }> {
  const queue = getSyncQueue();
  if (queue.length === 0) return { success: true };

  const failed: SyncQueueEntry[] = [];
  for (const entry of queue) {
    try {
      let result;
      if (entry.operation === 'delete') {
        result = await supabase.from(entry.table).delete().eq('id', entry.data.id);
      } else if (entry.operation === 'insert') {
        result = await supabase.from(entry.table).insert(entry.data);
      } else {
        result = await supabase.from(entry.table).update(entry.data).eq('id', entry.data.id);
      }
      if (result.error) throw result.error;
    } catch {
      failed.push(entry);
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failed));
    return { success: false, error: `${failed.length} items failed` };
  }
  clearSyncQueue();
  return { success: true };
}

export async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return (data || []) as T[];
}

export async function fetchById<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function insertRow<T>(table: string, row: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabase.from(table).insert(row).select().maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function updateRow<T>(table: string, id: string, updates: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export type {
  Category, MenuItem, Modifier, RestaurantTable, Order, OrderItem,
  Customer, Driver, DeliveryZone, Staff, Shift, Printer, Settings, VoidedItem,
};
