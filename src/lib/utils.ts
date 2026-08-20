import type { Lang } from './i18n';
import type { Order, OrderItem, Settings } from './types';

export function formatPrice(amount: number, settings: Settings | null): string {
  const symbol = settings?.currency_symbol || 'دج';
  const formatted = Number(amount || 0).toFixed(2);
  return `${formatted} ${symbol}`;
}

export function formatNumber(amount: number): string {
  return Number(amount || 0).toFixed(2);
}

export function localizedName(
  obj: { name_ar: string; name_fr: string },
  lang: Lang
): string {
  return lang === 'ar' ? obj.name_ar : obj.name_fr;
}

export function timeAgo(dateStr: string, lang: Lang): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'maintenant';
  if (mins < 60) return lang === 'ar' ? `منذ ${mins} د` : `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return lang === 'ar' ? `منذ ${hrs} س` : `il y a ${hrs}h`;
}

export function tableDuration(occupiedAt: string | null, lang: Lang): string {
  if (!occupiedAt) return '00:00';
  const diff = Date.now() - new Date(occupiedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeOrderTotals(items: OrderItem[], taxRate: number, deliveryFee: number, discount: number) {
  const subtotal = items
    .filter((i) => !i.voided)
    .reduce((sum, i) => sum + Number(i.line_total), 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount + deliveryFee;
  return { subtotal, taxAmount, total, deliveryFee, discount };
}

export function computeItemLineTotal(unitPrice: number, quantity: number, modifiers: { price: number; is_note: boolean }[]): number {
  const modifierTotal = modifiers
    .filter((m) => !m.is_note)
    .reduce((sum, m) => sum + Number(m.price), 0);
  return (unitPrice + modifierTotal) * quantity;
}

export function generateOrderNumber(existingOrders: Order[]): number {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayOrders = existingOrders.filter(
    (o) => new Date(o.created_at).getTime() >= todayStart
  );
  return todayOrders.length + 1;
}

export function formatDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr);
  return d.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
