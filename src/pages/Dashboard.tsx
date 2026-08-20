import { useMemo } from 'react';
import {
  DollarSign, ShoppingBag, UtensilsCrossed, TrendingUp,
  Receipt, ArrowRight, Clock,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, StatCard, Badge, EmptyState } from '@/components/ui';
import { formatPrice, timeAgo, localizedName } from '@/lib/utils';
import type { Page } from '@/components/Layout';

export function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { t, lang, settings, orders, orderItems, tables, menuItems } = useApp();

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart && o.status !== 'cancelled');
    const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const activeOrders = orders.filter((o) => o.status === 'open' || o.status === 'sent_to_kitchen');
    const occupiedTables = tables.filter((tbl) => tbl.status === 'occupied');
    const avgOrder = todayOrders.length > 0 ? todaySales / todayOrders.length : 0;

    const channelMap: Record<string, number> = { dine_in: 0, takeaway: 0, delivery: 0 };
    todayOrders.forEach((o) => { channelMap[o.channel] = (channelMap[o.channel] || 0) + Number(o.total); });

    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    todayOrders.forEach((o) => {
      const items = orderItems.filter((oi) => oi.order_id === o.id && !oi.voided);
      items.forEach((item) => {
        const key = item.menu_item_id || item.name_ar;
        const name = localizedName({ name_ar: item.name_ar, name_fr: item.name_fr }, lang);
        if (!itemCounts[key]) itemCounts[key] = { name, count: 0, revenue: 0 };
        itemCounts[key].count += item.quantity;
        itemCounts[key].revenue += Number(item.line_total);
      });
    });
    const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    const maxChannel = Math.max(...Object.values(channelMap), 1);

    return { todaySales, activeOrders, occupiedTables, avgOrder, todayOrders, channelMap, topItems, maxChannel };
  }, [orders, orderItems, tables, lang]);

  const channelLabels: Record<string, { ar: string; fr: string }> = {
    dine_in: { ar: 'صالة', fr: 'Sur place' },
    takeaway: { ar: 'سفري', fr: 'À emporter' },
    delivery: { ar: 'توصيل', fr: 'Livraison' },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('welcomeBack')}</h2>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign size={22} />}
          label={t('todaySales')}
          value={formatPrice(stats.todaySales, settings)}
          color="green"
          trend={t('today')}
        />
        <StatCard
          icon={<ShoppingBag size={22} />}
          label={t('activeOrders')}
          value={String(stats.activeOrders.length)}
          color="blue"
        />
        <StatCard
          icon={<UtensilsCrossed size={22} />}
          label={t('tablesOccupied')}
          value={`${stats.occupiedTables.length}/${tables.length}`}
          color="amber"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label={t('avgOrder')}
          value={formatPrice(stats.avgOrder, settings)}
          color="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={18} className="text-slate-400" />
              {t('recentOrders')}
            </h3>
            <button
              onClick={() => onNavigate('dine_in')}
              className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            >
              {t('all')} <ArrowRight size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
            </button>
          </div>

          {stats.todayOrders.length === 0 ? (
            <EmptyState icon={<Receipt size={28} />} title={t('noOrders')} />
          ) : (
            <div className="space-y-2">
              {stats.todayOrders.slice(0, 8).map((order) => {
                const items = orderItems.filter((oi) => oi.order_id === order.id && !oi.voided);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                        #{order.order_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700 text-sm">
                            {order.table_label || order.customer_name || `${t('orderNumber')} ${order.order_number}`}
                          </span>
                          <Badge color={
                            order.channel === 'dine_in' ? 'blue' :
                            order.channel === 'takeaway' ? 'amber' : 'green'
                          } size="sm">
                            {lang === 'ar' ? channelLabels[order.channel]?.ar : channelLabels[order.channel]?.fr}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {items.length} {t('items')} · {timeAgo(order.created_at, lang)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{formatPrice(order.total, settings)}</p>
                      <Badge color={
                        order.status === 'paid' ? 'green' :
                        order.status === 'sent_to_kitchen' ? 'amber' :
                        order.status === 'cancelled' ? 'red' : 'slate'
                      } size="sm">
                        {t('orderStatus') && (lang === 'ar' ?
                          (translations_ar_status[order.status] || order.status) :
                          (translations_fr_status[order.status] || order.status)
                        )}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Sales by channel + Top items */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">{t('salesByChannel')}</h3>
            <div className="space-y-3">
              {(['dine_in', 'takeaway', 'delivery'] as const).map((ch) => {
                const amount = stats.channelMap[ch] || 0;
                const pct = (amount / stats.maxChannel) * 100;
                return (
                  <div key={ch}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">
                        {lang === 'ar' ? channelLabels[ch].ar : channelLabels[ch].fr}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{formatPrice(amount, settings)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ch === 'dine_in' ? 'bg-blue-400' :
                          ch === 'takeaway' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">{t('topItems')}</h3>
            {stats.topItems.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{t('noData')}</p>
            ) : (
              <div className="space-y-2">
                {stats.topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-slate-400 text-xs">{item.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const translations_ar_status: Record<string, string> = {
  open: 'مفتوح',
  sent_to_kitchen: 'في المطبخ',
  ready: 'جاهز',
  paid: 'مدفوع',
  cancelled: 'ملغى',
};

const translations_fr_status: Record<string, string> = {
  open: 'Ouverte',
  sent_to_kitchen: 'En cuisine',
  ready: 'Prête',
  paid: 'Payée',
  cancelled: 'Annulée',
};
