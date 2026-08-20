import { useState, useEffect, useMemo } from 'react';
import { Users, Clock, Plus, ArrowRight, X, Check } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { tableDuration, formatPrice, localizedName } from '@/lib/utils';
import { OrderBuilder } from './OrderBuilder';
import { supabase } from '@/lib/supabase';
import type { RestaurantTable, Order } from '@/lib/types';

export function DineIn() {
  const { t, lang, tables, orders, orderItems, settings, refreshTables, refreshOrders } = useApp();
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [, setTick] = useState(0);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTableClick = (table: RestaurantTable) => {
    setSelectedTable(table);
    if (table.current_order_id) {
      const order = orders.find((o) => o.id === table.current_order_id);
      if (order) {
        const items = orderItems.filter((oi) => oi.order_id === order.id);
        setExistingOrder({ ...order, order_items: items });
      }
    } else {
      setExistingOrder(null);
    }
    setShowBuilder(true);
  };

  const handleCloseBuilder = async () => {
    setShowBuilder(false);
    setSelectedTable(null);
    setExistingOrder(null);
    await refreshTables();
    await refreshOrders();
  };

  const stats = useMemo(() => {
    const free = tables.filter((tbl) => tbl.status === 'free').length;
    const occupied = tables.filter((tbl) => tbl.status === 'occupied').length;
    return { free, occupied, total: tables.length };
  }, [tables]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Stats bar */}
      <div className="flex items-center gap-4">
        <Card className="flex-1 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('free')}</p>
            <p className="text-lg font-bold text-slate-800">{stats.free} / {stats.total}</p>
          </div>
        </Card>
        <Card className="flex-1 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('occupied')}</p>
            <p className="text-lg font-bold text-slate-800">{stats.occupied} / {stats.total}</p>
          </div>
        </Card>
      </div>

      {/* Table grid */}
      {tables.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title={t('noData')} message={t('addTable')} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const order = orders.find((o) => o.id === table.current_order_id);
            const itemCount = order ? orderItems.filter((oi) => oi.order_id === order.id && !oi.voided).length : 0;
            const isOccupied = table.status === 'occupied';
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`relative p-5 rounded-2xl border-2 transition-all group hover:shadow-lg ${
                  isOccupied
                    ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                    : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                {/* Status dot */}
                <div className={`absolute top-3 ltr:right-3 rtl:left-3 w-2.5 h-2.5 rounded-full ${
                  isOccupied ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />

                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${
                    isOccupied ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Users size={24} />
                  </div>
                  <p className="font-bold text-slate-800">{table.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{table.seats} {t('seats')}</p>

                  {isOccupied && (
                    <div className="mt-2 space-y-1 w-full">
                      <div className="flex items-center justify-center gap-1 text-xs text-amber-600 font-mono font-medium">
                        <Clock size={12} />
                        {tableDuration(table.occupied_at, lang)}
                      </div>
                      {itemCount > 0 && (
                        <p className="text-xs text-slate-400">{itemCount} {t('items')}</p>
                      )}
                      {order && (
                        <p className="text-xs font-bold text-slate-600">{formatPrice(order.total, settings)}</p>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Order Builder Modal */}
      {showBuilder && selectedTable && (
        <div className="fixed inset-0 z-40 bg-white">
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseBuilder}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
              <div>
                <h2 className="font-bold text-slate-800">
                  {t('table')}: {selectedTable.label}
                </h2>
                <p className="text-xs text-slate-400">
                  {existingOrder ? `${t('orderNumber')} ${existingOrder.order_number}` : t('newOrder')}
                </p>
              </div>
            </div>
            {existingOrder && (
              <Badge color={existingOrder.status === 'paid' ? 'green' : 'amber'}>
                {t('orderStatus') && (lang === 'ar' ? arStatus[existingOrder.status] : frStatus[existingOrder.status])}
              </Badge>
            )}
          </div>
          <div className="h-[calc(100vh-4rem)]">
            <OrderBuilder
              channel="dine_in"
              tableId={selectedTable.id}
              tableLabel={selectedTable.label}
              existingOrder={existingOrder}
              onOrderCreated={handleCloseBuilder}
              onOrderUpdated={handleCloseBuilder}
              onClose={handleCloseBuilder}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const arStatus: Record<string, string> = {
  open: 'مفتوح',
  sent_to_kitchen: 'في المطبخ',
  ready: 'جاهز',
  paid: 'مدفوع',
  cancelled: 'ملغى',
};

const frStatus: Record<string, string> = {
  open: 'Ouverte',
  sent_to_kitchen: 'En cuisine',
  ready: 'Prête',
  paid: 'Payée',
  cancelled: 'Annulée',
};
