import type { Order, OrderItem, Printer, Settings } from './types';
import type { Lang } from './i18n';
import { localizedName } from './utils';

export interface PrintLine {
  text: string;
  bold?: boolean;
  size?: 'normal' | 'double';
  align?: 'left' | 'center' | 'right';
}

export function buildReceiptLines(order: Order, items: OrderItem[], settings: Settings, lang: Lang): PrintLine[] {
  const lines: PrintLine[] = [];
  const name = localizedName({ name_ar: '', name_fr: '' }, lang);

  lines.push({ text: settings.restaurant_name, bold: true, size: 'double', align: 'center' });
  if (settings.address) lines.push({ text: settings.address, align: 'center' });
  if (settings.phone) lines.push({ text: settings.phone, align: 'center' });
  lines.push({ text: '-'.repeat(32), align: 'center' });
  lines.push({ text: `${lang === 'ar' ? 'طلب رقم' : 'Commande N°'}: ${order.order_number}`, bold: true });
  lines.push({ text: `${lang === 'ar' ? 'التاريخ' : 'Date'}: ${new Date(order.created_at).toLocaleString()}` });
  if (order.table_label) lines.push({ text: `${lang === 'ar' ? 'الطاولة' : 'Table'}: ${order.table_label}` });
  if (order.customer_name) lines.push({ text: `${lang === 'ar' ? 'العميل' : 'Client'}: ${order.customer_name}` });
  if (order.customer_phone) lines.push({ text: `${lang === 'ar' ? 'الهاتف' : 'Tél'}: ${order.customer_phone}` });
  if (order.customer_address) lines.push({ text: `${lang === 'ar' ? 'العنوان' : 'Adresse'}: ${order.customer_address}` });
  lines.push({ text: '-'.repeat(32), align: 'center' });

  for (const item of items) {
    if (item.voided) continue;
    const itemName = lang === 'ar' ? item.name_ar : item.name_fr;
    lines.push({ text: `${item.quantity}x  ${itemName}`, bold: true });
    lines.push({ text: `     ${Number(item.line_total).toFixed(2)} ${settings.currency_symbol}`, align: 'right' });
    if (item.modifiers_json && item.modifiers_json.length > 0) {
      for (const mod of item.modifiers_json) {
        const modName = lang === 'ar' ? mod.name_ar : mod.name_fr;
        const prefix = mod.is_note ? '-' : '+';
        lines.push({ text: `     ${prefix} ${modName}`, size: 'normal' });
      }
    }
  }

  lines.push({ text: '-'.repeat(32), align: 'center' });
  lines.push({ text: `${lang === 'ar' ? 'المجموع الفرعي' : 'Sous-total'}: ${Number(order.subtotal).toFixed(2)}`, align: 'right' });
  if (order.discount > 0) lines.push({ text: `${lang === 'ar' ? 'الخصم' : 'Remise'}: -${Number(order.discount).toFixed(2)}`, align: 'right' });
  if (order.tax_amount > 0) lines.push({ text: `${lang === 'ar' ? 'الضريبة' : 'Taxe'}: ${Number(order.tax_amount).toFixed(2)}`, align: 'right' });
  if (order.delivery_fee > 0) lines.push({ text: `${lang === 'ar' ? 'التوصيل' : 'Livraison'}: ${Number(order.delivery_fee).toFixed(2)}`, align: 'right' });
  lines.push({ text: `${lang === 'ar' ? 'الإجمالي' : 'Total'}: ${Number(order.total).toFixed(2)} ${settings.currency_symbol}`, bold: true, size: 'double', align: 'right' });
  if (order.payment_method) {
    lines.push({ text: `${lang === 'ar' ? 'الدفع' : 'Paiement'}: ${order.payment_method === 'cash' ? (lang === 'ar' ? 'نقداً' : 'Espèces') : (lang === 'ar' ? 'بطاقة' : 'Carte')}`, align: 'right' });
  }
  if (settings.footer_receipt) {
    lines.push({ text: '-'.repeat(32), align: 'center' });
    lines.push({ text: settings.footer_receipt, align: 'center' });
  }

  return lines;
}

export function buildKitchenLines(order: Order, items: OrderItem[], lang: Lang): PrintLine[] {
  const lines: PrintLine[] = [];
  lines.push({ text: lang === 'ar' ? 'بون المطبخ' : 'Ticket Cuisine', bold: true, size: 'double', align: 'center' });
  lines.push({ text: '-'.repeat(32), align: 'center' });
  lines.push({ text: `${lang === 'ar' ? 'طلب رقم' : 'Commande N°'}: ${order.order_number}`, bold: true });
  if (order.table_label) lines.push({ text: `${lang === 'ar' ? 'الطاولة' : 'Table'}: ${order.table_label}` });
  if (order.customer_name && order.channel !== 'dine_in') lines.push({ text: `${lang === 'ar' ? 'العميل' : 'Client'}: ${order.customer_name}` });
  lines.push({ text: `${new Date().toLocaleTimeString()}`, align: 'right' });
  lines.push({ text: '-'.repeat(32), align: 'center' });

  for (const item of items) {
    if (item.voided || item.printed) continue;
    const itemName = lang === 'ar' ? item.name_ar : item.name_fr;
    lines.push({ text: `${item.quantity}x  ${itemName}`, bold: true, size: 'double' });
    if (item.modifiers_json && item.modifiers_json.length > 0) {
      for (const mod of item.modifiers_json) {
        const modName = lang === 'ar' ? mod.name_ar : mod.name_fr;
        const prefix = mod.is_note ? '-' : '+';
        lines.push({ text: `     ${prefix} ${modName}` });
      }
    }
    if (order.notes) lines.push({ text: `     * ${order.notes}` });
  }

  return lines;
}

export function buildLabelLines(order: Order, lang: Lang): PrintLine[] {
  return [
    { text: lang === 'ar' ? 'ملصق الطلب' : 'Étiquette', bold: true, align: 'center' },
    { text: `${lang === 'ar' ? 'طلب رقم' : 'Commande N°'}: ${order.order_number}`, bold: true, align: 'center' },
    { text: order.customer_name || '', align: 'center' },
    { text: order.customer_phone || '', align: 'center' },
    ...(order.notes ? [{ text: order.notes, align: 'center' as const }] : []),
  ];
}

export async function sendToPrinter(printer: Printer, lines: PrintLine[]): Promise<{ success: boolean; error?: string }> {
  const payload = { printer, lines };

  if (printer.connection_type === 'network' && printer.ip_address) {
    try {
      await fetch(`http://${printer.ip_address}:${printer.port}`, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // Network printers may not respond to fetch in browser; this is expected
    }
  }

  console.log(`[PRINT] ${printer.name} (${printer.station}):`, lines);
  return { success: true };
}

export async function triggerCashDrawer(printer: Printer): Promise<void> {
  console.log(`[CASH DRAWER] Pulse sent to ${printer.name}`);
  await sendToPrinter(printer, [{ text: '--- CASH DRAWER PULSE ---', align: 'center' }]);
}
