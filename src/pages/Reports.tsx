import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Receipt, Package, Clock, Printer } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, StatCard, EmptyState } from '@/components/ui';
import { formatPrice, localizedName, formatDate } from '@/lib/utils';
import { buildReceiptLines, sendToPrinter } from '@/lib/print';

export function Reports() {
  const { t, lang, settings, orders, orderItems, shifts, printers } = useApp();
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (dateRange === 'yesterday') {
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return orders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= start && d <= end && o.status !== 'cancelled';
      });
    }
    if (dateRange === 'week') {
      start.setDate(start.getDate() - 7);
    }
    if (dateRange === 'month') {
      start.setMonth(start.getMonth() - 1);
    }

    return orders.filter((o) => new Date(o.created_at) >= start && o.status !== 'cancelled');
  }, [orders, dateRange]);

  const stats = useMemo(() => {
    const grossSales = filteredOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const netSales = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const taxCollected = filteredOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0);
    const discounts = filteredOrders.reduce((sum, o) => sum + Number(o.discount), 0);
    const deliveryFees = filteredOrders.reduce((sum, o) => sum + Number(o.delivery_fee), 0);

    const channelMap: Record<string, { count: number; revenue: number }> = {
      dine_in: { count: 0, revenue: 0 },
      takeaway: { count: 0, revenue: 0 },
      delivery: { count: 0, revenue: 0 },
    };
    filteredOrders.forEach((o) => {
      channelMap[o.channel].count++;
      channelMap[o.channel].revenue += Number(o.total);
    });

    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    filteredOrders.forEach((o) => {
      const items = orderItems.filter((oi) => oi.order_id === o.id && !oi.voided);
      items.forEach((item) => {
        const key = item.menu_item_id || item.name_ar;
        const name = localizedName({ name_ar: item.name_ar, name_fr: item.name_fr }, lang);
        if (!itemCounts[key]) itemCounts[key] = { name, count: 0, revenue: 0 };
        itemCounts[key].count += item.quantity;
        itemCounts[key].revenue += Number(item.line_total);
      });
    });
    const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 10);

    const cashOrders = filteredOrders.filter((o) => o.payment_method === 'cash');
    const cardOrders = filteredOrders.filter((o) => o.payment_method === 'card');
    const cashTotal = cashOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const cardTotal = cardOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const paidOrders = filteredOrders.filter((o) => o.status === 'paid');
    const avgOrder = paidOrders.length > 0 ? netSales / paidOrders.length : 0;

    return { grossSales, netSales, taxCollected, discounts, deliveryFees, channelMap, topItems, cashTotal, cardTotal, avgOrder, orderCount: filteredOrders.length };
  }, [filteredOrders, orderItems, lang]);

  const printZReport = async () => {
    const cashierPrinter = printers.find((p) => p.station === 'cashier' && p.active);
    if (!cashierPrinter || !settings) return;
    const lines = [
      { text: settings.restaurant_name, bold: true, align: 'center' as const },
      { text: lang === 'ar' ? 'تقرير Z' : 'Rapport Z', bold: true, align: 'center' as const },
      { text: '-'.repeat(32), align: 'center' as const },
      { text: `${lang === 'ar' ? 'التاريخ' : 'Date'}: ${new Date().toLocaleString()}` },
      { text: '-'.repeat(32), align: 'center' as const },
      { text: `${lang === 'ar' ? 'إجمالي المبيعات' : 'Ventes brutes'}: ${stats.grossSales.toFixed(2)}` },
      { text: `${lang === 'ar' ? 'صافي المبيعات' : 'Ventes nettes'}: ${stats.netSales.toFixed(2)}` },
      { text: `${lang === 'ar' ? 'الضريبة' : 'Taxe'}: ${stats.taxCollected.toFixed(2)}` },
      { text: `${lang === 'ar' ? 'الخصومات' : 'Remises'}: ${stats.discounts.toFixed(2)}` },
      { text: `${lang === 'ar' ? 'رسوم التوصيل' : 'Frais livraison'}: ${stats.deliveryFees.toFixed(2)}` },
      { text: '-'.repeat(32), align: 'center' as const },
      { text: `${lang === 'ar' ? 'صالة' : 'Sur place'}: ${stats.channelMap.dine_in.revenue.toFixed(2)} (${stats.channelMap.dine_in.count})` },
      { text: `${lang === 'ar' ? 'سفري' : 'À emporter'}: ${stats.channelMap.takeaway.revenue.toFixed(2)} (${stats.channelMap.takeaway.count})` },
      { text: `${lang === 'ar' ? 'توصيل' : 'Livraison'}: ${stats.channelMap.delivery.revenue.toFixed(2)} (${stats.channelMap.delivery.count})` },
      { text: '-'.repeat(32), align: 'center' as const },
      { text: `${lang === 'ar' ? 'نقداً' : 'Espèces'}: ${stats.cashTotal.toFixed(2)}` },
      { text: `${lang === 'ar' ? 'بطاقة' : 'Carte'}: ${stats.cardTotal.toFixed(2)}` },
      { text: '-'.repeat(32), align: 'center' as const },
      { text: lang === 'ar' ? 'الأكثر مبيعاً' : 'Meilleures ventes', bold: true },
      ...stats.topItems.slice(0, 5).map((item) => ({ text: `${item.count}x ${item.name} - ${item.revenue.toFixed(2)}` })),
    ];
    await sendToPrinter(cashierPrinter, lines);
  };

  const channelLabels: Record<string, { ar: string; fr: string }> = {
    dine_in: { ar: 'صالة', fr: 'Sur place' },
    takeaway: { ar: 'سفري', fr: 'À emporter' },
    delivery: { ar: 'توصيل', fr: 'Livraison' },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Date range + Print */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {(['today', 'yesterday', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                dateRange === range ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t(range)}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={printZReport}>
          <Printer size={16} className="inline mr-1" />
          {t('printZReport')}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp size={22} />} label={t('grossSales')} value={formatPrice(stats.grossSales, settings)} color="green" />
        <StatCard icon={<Receipt size={22} />} label={t('netSales')} value={formatPrice(stats.netSales, settings)} color="blue" />
        <StatCard icon={<BarChart3 size={22} />} label={t('avgOrder')} value={formatPrice(stats.avgOrder, settings)} color="slate" />
        <StatCard icon={<Package size={22} />} label={t('orders')} value={String(stats.orderCount)} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by channel */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">{t('salesByChannel')}</h3>
          <div className="space-y-4">
            {(['dine_in', 'takeaway', 'delivery'] as const).map((ch) => {
              const data = stats.channelMap[ch];
              const pct = stats.netSales > 0 ? (data.revenue / stats.netSales) * 100 : 0;
              return (
                <div key={ch}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">
                      {lang === 'ar' ? channelLabels[ch].ar : channelLabels[ch].fr}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {formatPrice(data.revenue, settings)} ({data.count})
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ch === 'dine_in' ? 'bg-blue-400' : ch === 'takeaway' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('cash')}</span>
              <span className="font-medium text-slate-700">{formatPrice(stats.cashTotal, settings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('card')}</span>
              <span className="font-medium text-slate-700">{formatPrice(stats.cardTotal, settings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('tax')}</span>
              <span className="font-medium text-slate-700">{formatPrice(stats.taxCollected, settings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('discount')}</span>
              <span className="font-medium text-slate-700">{formatPrice(stats.discounts, settings)}</span>
            </div>
          </div>
        </Card>

        {/* Top sellers */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">{t('topSellers')}</h3>
          {stats.topItems.length === 0 ? (
            <EmptyState icon={<Package size={24} />} title={t('noData')} />
          ) : (
            <div className="space-y-3">
              {stats.topItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-700">{item.count}x</span>
                    <span className="text-xs text-slate-400 ms-2">{formatPrice(item.revenue, settings)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent orders list */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-4">{t('recentOrders')}</h3>
        {filteredOrders.length === 0 ? (
          <EmptyState icon={<Receipt size={24} />} title={t('noOrders')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-100">
                  <th className="text-start py-2 px-3 font-medium">#</th>
                  <th className="text-start py-2 px-3 font-medium">{t('date')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('channel')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('status')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('items')}</th>
                  <th className="text-end py-2 px-3 font-medium">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 20).map((order) => {
                  const itemCount = orderItems.filter((oi) => oi.order_id === order.id && !oi.voided).length;
                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-700">#{order.order_number}</td>
                      <td className="py-2 px-3 text-slate-500">{formatDate(order.created_at, lang)}</td>
                      <td className="py-2 px-3">
                        <Badge color={order.channel === 'dine_in' ? 'blue' : order.channel === 'takeaway' ? 'amber' : 'green'} size="sm">
                          {lang === 'ar' ? channelLabels[order.channel].ar : channelLabels[order.channel].fr}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge color={order.status === 'paid' ? 'green' : order.status === 'cancelled' ? 'red' : 'slate'} size="sm">
                          {lang === 'ar' ? arStatus[order.status] : frStatus[order.status]}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{itemCount}</td>
                      <td className="py-2 px-3 text-end font-bold text-slate-700">{formatPrice(order.total, settings)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const arStatus: Record<string, string> = { open: 'مفتوح', sent_to_kitchen: 'في المطبخ', ready: 'جاهز', paid: 'مدفوع', cancelled: 'ملغى' };
const frStatus: Record<string, string> = { open: 'Ouverte', sent_to_kitchen: 'En cuisine', ready: 'Prête', paid: 'Payée', cancelled: 'Annulée' };
