import { useState, useMemo } from 'react';
import { Bike, Plus, X, Phone, MapPin, Clock, User, Search } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, EmptyState, Input, Select } from '@/components/ui';
import { OrderBuilder } from './OrderBuilder';
import { timeAgo, formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/types';

export function Delivery() {
  const { t, lang, orders, orderItems, settings, customers, drivers, zones, refreshOrders } = useApp();
  const [showBuilder, setShowBuilder] = useState(false);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<'all' | 'received' | 'preparing' | 'out_for_delivery' | 'delivered'>('all');

  const deliveryOrders = useMemo(() => {
    return orders.filter((o) => o.channel === 'delivery' && o.status !== 'cancelled');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return deliveryOrders;
    return deliveryOrders.filter((o) => {
      if (filter === 'received') return o.status === 'open' || o.status === 'sent_to_kitchen';
      if (filter === 'preparing') return o.status === 'sent_to_kitchen';
      if (filter === 'out_for_delivery') return o.status === 'ready';
      if (filter === 'delivered') return o.status === 'paid';
      return true;
    });
  }, [deliveryOrders, filter]);

  const handleNewOrder = () => {
    setExistingOrder(null);
    setShowBuilder(true);
  };

  const handleClose = async () => {
    setShowBuilder(false);
    setExistingOrder(null);
    await refreshOrders();
  };

  const updateDeliveryStatus = async (order: Order, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', order.id);
    await refreshOrders();
  };

  const assignDriver = async (order: Order, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    await supabase.from('orders').update({
      driver_id: driverId,
      driver_name: driver?.name || null,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id);
    await refreshOrders();
  };

  const filterTabs = [
    { id: 'all' as const, label: t('all'), count: deliveryOrders.length },
    { id: 'received' as const, label: t('deliveryStatus.received'), count: deliveryOrders.filter((o) => o.status === 'open').length },
    { id: 'preparing' as const, label: t('deliveryStatus.preparing'), count: deliveryOrders.filter((o) => o.status === 'sent_to_kitchen').length },
    { id: 'out_for_delivery' as const, label: t('deliveryStatus.out_for_delivery'), count: deliveryOrders.filter((o) => o.status === 'ready').length },
    { id: 'delivered' as const, label: t('deliveryStatus.delivered'), count: deliveryOrders.filter((o) => o.status === 'paid').length },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === tab.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <Button onClick={handleNewOrder}>
          <Plus size={18} className="inline mr-1" />
          {t('newOrder')}
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Bike size={28} />}
          title={t('noOrders')}
          action={<Button onClick={handleNewOrder}>{t('newOrder')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const items = orderItems.filter((oi) => oi.order_id === order.id && !oi.voided);
            return (
              <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white">
                      #{order.order_number}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{timeAgo(order.created_at, lang)}</p>
                    </div>
                  </div>
                  <Badge color={
                    order.status === 'paid' ? 'green' :
                    order.status === 'ready' ? 'blue' :
                    order.status === 'sent_to_kitchen' ? 'amber' : 'slate'
                  }>
                    {lang === 'ar' ? arStatus[order.status] : frStatus[order.status]}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  {order.customer_name && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User size={14} className="text-slate-400" />
                      {order.customer_name}
                    </div>
                  )}
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      {order.customer_phone}
                    </div>
                  )}
                  {order.customer_address && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-slate-400 mt-0.5" />
                      <span className="line-clamp-2">{order.customer_address}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 mb-3 pt-2 border-t border-slate-50">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-sm text-slate-600">
                      {item.quantity}x {lang === 'ar' ? item.name_ar : item.name_fr}
                    </div>
                  ))}
                  {items.length > 3 && <p className="text-xs text-slate-400">+{items.length - 3} {t('items')}</p>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-800">{formatPrice(order.total, settings)}</span>
                  <div className="flex gap-2">
                    {order.status === 'sent_to_kitchen' && (
                      <Button size="sm" variant="secondary" onClick={() => updateDeliveryStatus(order, 'ready')}>
                        {t('deliveryStatus.out_for_delivery')}
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button size="sm" variant="success" onClick={() => updateDeliveryStatus(order, 'paid')}>
                        {t('deliveryStatus.delivered')}
                      </Button>
                    )}
                  </div>
                </div>

                {order.status !== 'paid' && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <Select
                      value={order.driver_id || ''}
                      onChange={(v) => assignDriver(order, v)}
                      options={drivers.filter((d) => d.active).map((d) => ({ value: d.id, label: d.name }))}
                      placeholder={t('selectDriver')}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 z-40 bg-white">
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
              <h2 className="font-bold text-slate-800">{t('delivery')} - {t('newOrder')}</h2>
            </div>
          </div>
          <div className="h-[calc(100vh-4rem)]">
            <OrderBuilder
              channel="delivery"
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
  open: 'تم الاستلام',
  sent_to_kitchen: 'قيد التحضير',
  ready: 'خرج للتوصيل',
  paid: 'تم التسليم',
  cancelled: 'ملغى',
};

const frStatus: Record<string, string> = {
  open: 'Reçue',
  sent_to_kitchen: 'En préparation',
  ready: 'En livraison',
  paid: 'Livrée',
  cancelled: 'Annulée',
};
