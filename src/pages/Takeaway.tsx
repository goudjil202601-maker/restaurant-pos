import { useState, useMemo } from 'react';
import { ShoppingBag, Plus, X, Clock, Bell, Search } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { OrderBuilder } from './OrderBuilder';
import { timeAgo, formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/types';

export function Takeaway() {
  const { t, lang, orders, orderItems, settings, refreshOrders } = useApp();
  const [showBuilder, setShowBuilder] = useState(false);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<'all' | 'preparing' | 'ready'>('all');

  const takeawayOrders = useMemo(() => {
    return orders.filter((o) => o.channel === 'takeaway' && o.status !== 'cancelled');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'preparing') return takeawayOrders.filter((o) => o.status === 'sent_to_kitchen' || o.status === 'open');
    if (filter === 'ready') return takeawayOrders.filter((o) => o.status === 'ready');
    return takeawayOrders;
  }, [takeawayOrders, filter]);

  const handleNewOrder = () => {
    setExistingOrder(null);
    setShowBuilder(true);
  };

  const handleClose = async () => {
    setShowBuilder(false);
    setExistingOrder(null);
    await refreshOrders();
  };

  const markReady = async (order: Order) => {
    await supabase.from('orders').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', order.id);
    await refreshOrders();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t('all')} ({takeawayOrders.length})
          </button>
          <button
            onClick={() => setFilter('preparing')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'preparing' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock size={14} className="inline mr-1" />
            {t('orderStatus.sent_to_kitchen')}
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'ready' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell size={14} className="inline mr-1" />
            {t('orderStatus.ready')}
          </button>
        </div>
        <Button onClick={handleNewOrder}>
          <Plus size={18} className="inline mr-1" />
          {t('newOrder')}
        </Button>
      </div>

      {/* Orders grid */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} />}
          title={t('noOrders')}
          action={<Button onClick={handleNewOrder}>{t('newOrder')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const items = orderItems.filter((oi) => oi.order_id === order.id && !oi.voided);
            const isReady = order.status === 'ready';
            const isPreparing = order.status === 'sent_to_kitchen' || order.status === 'open';
            return (
              <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                      isReady ? 'bg-emerald-500' : isPreparing ? 'bg-amber-500' : 'bg-slate-400'
                    }`}>
                      #{order.order_number}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{timeAgo(order.created_at, lang)}</p>
                      {order.eta_minutes && (
                        <p className="text-xs text-slate-400">{t('eta')}: {order.eta_minutes} {t('minutes')}</p>
                      )}
                    </div>
                  </div>
                  <Badge color={isReady ? 'green' : isPreparing ? 'amber' : 'slate'}>
                    {lang === 'ar' ? arStatus[order.status] : frStatus[order.status]}
                  </Badge>
                </div>

                <div className="space-y-1 mb-3">
                  {items.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.quantity}x {lang === 'ar' ? item.name_ar : item.name_fr}</span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <p className="text-xs text-slate-400">+{items.length - 4} {t('items')}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-800">{formatPrice(order.total, settings)}</span>
                  <div className="flex gap-2">
                    {isPreparing && (
                      <Button size="sm" variant="success" onClick={() => markReady(order)}>
                        <Bell size={14} className="inline mr-1" />
                        {t('orderStatus.ready')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Builder */}
      {showBuilder && (
        <div className="fixed inset-0 z-40 bg-white">
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="font-bold text-slate-800">{t('takeaway')} - {t('newOrder')}</h2>
            </div>
          </div>
          <div className="h-[calc(100vh-4rem)]">
            <OrderBuilder
              channel="takeaway"
              existingOrder={existingOrder}
              onOrderCreated={handleClose}
              onOrderUpdated={handleClose}
              onClose={handleClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const arStatus: Record<string, string> = {
  open: 'مفتوح',
  sent_to_kitchen: 'قيد التحضير',
  ready: 'جاهز',
  paid: 'مدفوع',
  cancelled: 'ملغى',
};

const frStatus: Record<string, string> = {
  open: 'Ouverte',
  sent_to_kitchen: 'En préparation',
  ready: 'Prête',
  paid: 'Payée',
  cancelled: 'Annulée',
};
