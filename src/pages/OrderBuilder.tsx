import { useState, useMemo, useCallback } from 'react';
import { Plus, Minus, Trash2, Search, AlertCircle } from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { Button, Card, Badge, Input } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { localizedName, computeItemLineTotal, computeOrderTotals, formatPrice } from '@/lib/utils';
import type { Channel, Order, OrderItem, OrderModifiersJSON } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export interface CartItem {
  id: string;
  menu_item_id: string | null;
  name_ar: string;
  name_fr: string;
  unit_price: number;
  quantity: number;
  modifiers: OrderModifiersJSON[];
  line_total: number;
  printed: boolean;
}

interface OrderBuilderProps {
  channel: Channel;
  tableId?: string | null;
  tableLabel?: string | null;
  existingOrder?: Order | null;
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onClose?: () => void;
}

export function OrderBuilder({ channel, tableId, tableLabel, existingOrder, onOrderCreated, onOrderUpdated, onClose }: OrderBuilderProps) {
  const { t, lang, settings, categories, menuItems, modifiers, orders, refreshOrders, refreshTables, staff, shifts } = useApp();
  const { canPay } = useAuth();
  const userCanPay = canPay(channel);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizingItem, setCustomizingItem] = useState<CartItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [voidTarget, setVoidTarget] = useState<CartItem | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize from existing order
  useMemo(() => {
    if (existingOrder) {
      const items = (existingOrder.order_items || []).filter((i: OrderItem) => !i.voided);
      setCart(items.map((i: OrderItem) => ({
        id: i.id,
        menu_item_id: i.menu_item_id,
        name_ar: i.name_ar,
        name_fr: i.name_fr,
        unit_price: Number(i.unit_price),
        quantity: i.quantity,
        modifiers: i.modifiers_json || [],
        line_total: Number(i.line_total),
        printed: i.printed,
      })));
      setNotes(existingOrder.notes || '');
      setDiscount(Number(existingOrder.discount));
    }
  }, [existingOrder]);

  const filteredItems = useMemo(() => {
    let items = menuItems.filter((m) => m.available);
    if (selectedCategory) items = items.filter((m) => m.category_id === selectedCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((m) => m.name_ar.includes(q) || m.name_fr.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const totals = useMemo(() => {
    return computeOrderTotals(
      cart.map((c) => ({ ...c, voided: false, order_id: '', modifiers_json: c.modifiers })) as unknown as OrderItem[],
      settings?.tax_rate || 0,
      0,
      discount
    );
  }, [cart, settings, discount]);

  const addToCart = useCallback((itemId: string) => {
    const item = menuItems.find((m) => m.id === itemId);
    if (!item) return;
    const itemModifiers = modifiers.filter((m) => m.menu_item_id === itemId);
    if (itemModifiers.length > 0) {
      const newCartItem: CartItem = {
        id: crypto.randomUUID(),
        menu_item_id: item.id,
        name_ar: item.name_ar,
        name_fr: item.name_fr,
        unit_price: Number(item.price),
        quantity: 1,
        modifiers: [],
        line_total: Number(item.price),
        printed: false,
      };
      setCustomizingItem(newCartItem);
    } else {
      setCart((prev) => {
        const existing = prev.find((c) => c.menu_item_id === itemId && c.modifiers.length === 0);
        if (existing) {
          return prev.map((c) =>
            c.id === existing.id
              ? { ...c, quantity: c.quantity + 1, line_total: computeItemLineTotal(c.unit_price, c.quantity + 1, c.modifiers) }
              : c
          );
        }
        return [...prev, {
          id: crypto.randomUUID(),
          menu_item_id: item.id,
          name_ar: item.name_ar,
          name_fr: item.name_fr,
          unit_price: Number(item.price),
          quantity: 1,
          modifiers: [],
          line_total: Number(item.price),
          printed: false,
        }];
      });
    }
  }, [menuItems, modifiers]);

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== cartItemId) return c;
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty, line_total: computeItemLineTotal(c.unit_price, newQty, c.modifiers) };
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartItemId));
  };

  const applyCustomization = (updated: CartItem) => {
    updated.line_total = computeItemLineTotal(updated.unit_price, updated.quantity, updated.modifiers);
    setCart((prev) => {
      const exists = prev.find((c) => c.id === updated.id);
      if (exists) return prev.map((c) => (c.id === updated.id ? updated : c));
      return [...prev, updated];
    });
    setCustomizingItem(null);
  };

  const handleVoid = () => {
    if (!voidTarget) return;
    const manager = staff.find((s) => s.role === 'manager' && s.pin === managerPin);
    if (!manager) {
      setPinError(true);
      return;
    }
    if (existingOrder && voidTarget.printed) {
      // Record void in audit
      supabase.from('voided_items').insert({
        order_id: existingOrder.id,
        order_item_id: voidTarget.id,
        name_ar: voidTarget.name_ar,
        reason: voidReason,
        voided_by: manager.name,
      }).then(() => {});
    }
    removeFromCart(voidTarget.id);
    setVoidTarget(null);
    setVoidReason('');
    setManagerPin('');
    setPinError(false);
    setShowPinModal(false);
  };

  const sendToKitchen = async () => {
    if (!existingOrder) {
      await createOrder('sent_to_kitchen');
    } else {
      await updateOrder('sent_to_kitchen');
    }
  };

  const payOrder = async () => {
    if (!existingOrder) {
      const order = await createOrder('paid');
      if (order) {
        setShowPayment(false);
        onOrderCreated?.(order);
      }
    } else {
      await updateOrder('paid');
      setShowPayment(false);
    }
  };

  const generateOrderNumber = () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart);
    return todayOrders.length + 1;
  };

  const createOrder = async (status: 'sent_to_kitchen' | 'paid'): Promise<Order | null> => {
    setSaving(true);
    try {
      const orderNumber = generateOrderNumber();
      const currentShift = shifts.find((s) => s.status === 'open');
      const taxRate = settings?.tax_rate || 0;
      const subtotal = cart.reduce((sum, c) => sum + c.line_total, 0);
      const afterDiscount = Math.max(0, subtotal - discount);
      const taxAmount = afterDiscount * (taxRate / 100);
      const total = afterDiscount + taxAmount;

      const orderData = {
        order_number: orderNumber,
        channel,
        status,
        table_id: tableId || null,
        table_label: tableLabel || null,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        delivery_fee: 0,
        discount,
        total,
        payment_method: status === 'paid' ? paymentMethod : null,
        payment_status: status === 'paid' ? 'paid' : 'unpaid',
        shift_id: currentShift?.id || null,
        sent_to_kitchen_at: status === 'sent_to_kitchen' || status === 'paid' ? new Date().toISOString() : null,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderResult) return null;

      const order = orderResult as Order;
      const orderItemsData = cart.map((c) => ({
        order_id: order.id,
        menu_item_id: c.menu_item_id,
        name_ar: c.name_ar,
        name_fr: c.name_fr,
        unit_price: c.unit_price,
        quantity: c.quantity,
        modifiers_json: c.modifiers,
        line_total: c.line_total,
        printed: true,
        voided: false,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      // Update table status
      if (tableId && status === 'sent_to_kitchen') {
        await supabase.from('restaurant_tables').update({
          status: 'occupied',
          current_order_id: order.id,
          occupied_at: new Date().toISOString(),
        }).eq('id', tableId);
      }
      if (tableId && status === 'paid') {
        await supabase.from('restaurant_tables').update({
          status: 'free',
          current_order_id: null,
          occupied_at: null,
        }).eq('id', tableId);
      }

      await refreshOrders();
      await refreshTables();
      onOrderCreated?.(order);
      return order;
    } catch (err) {
      console.error('Failed to create order:', err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateOrder = async (status: 'sent_to_kitchen' | 'paid') => {
    if (!existingOrder) return;
    setSaving(true);
    try {
      const subtotal = cart.reduce((sum, c) => sum + c.line_total, 0);
      const afterDiscount = Math.max(0, subtotal - discount);
      const taxAmount = afterDiscount * (settings?.tax_rate || 0) / 100;
      const total = afterDiscount + taxAmount;

      const updateData: Record<string, unknown> = {
        status,
        subtotal,
        tax_amount: taxAmount,
        discount,
        total,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid') {
        updateData.payment_method = paymentMethod;
        updateData.payment_status = 'paid';
        updateData.paid_at = new Date().toISOString();
      }
      if (status === 'sent_to_kitchen' && !existingOrder.sent_to_kitchen_at) {
        updateData.sent_to_kitchen_at = new Date().toISOString();
      }

      const { error: orderError } = await supabase.from('orders').update(updateData).eq('id', existingOrder.id);
      if (orderError) throw orderError;

      // Insert only new (unprinted) items
      const newItems = cart.filter((c) => !c.printed);
      if (newItems.length > 0) {
        const orderItemsData = newItems.map((c) => ({
          order_id: existingOrder.id,
          menu_item_id: c.menu_item_id,
          name_ar: c.name_ar,
          name_fr: c.name_fr,
          unit_price: c.unit_price,
          quantity: c.quantity,
          modifiers_json: c.modifiers,
          line_total: c.line_total,
          printed: true,
          voided: false,
        }));
        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
        if (itemsError) throw itemsError;

        // Mark existing cart items as printed
        setCart((prev) => prev.map((c) => ({ ...c, printed: true })));
      }

      // Update table status
      if (tableId && status === 'paid') {
        await supabase.from('restaurant_tables').update({
          status: 'free',
          current_order_id: null,
          occupied_at: null,
        }).eq('id', tableId);
      }

      await refreshOrders();
      await refreshTables();
      onOrderUpdated?.({ ...existingOrder, ...updateData } as Order);
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setSaving(false);
    }
  };

  const canSendToKitchen = cart.length > 0 && (!existingOrder || existingOrder.status !== 'sent_to_kitchen' || cart.some((c) => !c.printed));
  const canPayOrder = userCanPay && cart.length > 0 && (!existingOrder || existingOrder.status === 'sent_to_kitchen' || existingOrder.status === 'open' || existingOrder.status === 'ready');

  return (
    <div className="flex flex-col h-full">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu items side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 pb-2">
            <div className="relative">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/10 focus:border-slate-400 ltr:pl-10 rtl:pr-10"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t('all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {localizedName(cat, lang)}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item.id)}
                  className="bg-white rounded-xl border border-slate-100 p-4 text-start hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">
                      {item.station === 'kitchen' ? t('kitchen') : t('bar')}
                    </span>
                    <Plus size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <p className="font-medium text-slate-800 text-sm mb-1 line-clamp-2">
                    {localizedName(item, lang)}
                  </p>
                  <p className="text-sm font-bold text-slate-700">{formatPrice(Number(item.price), settings)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart side */}
        <div className="w-96 bg-white border-s ltr:border-slate-100 rtl:border-slate-100 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{t('cart')}</h3>
              {tableLabel && <Badge color="blue">{t('table')}: {tableLabel}</Badge>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                  <Search size={24} />
                </div>
                <p className="text-sm text-slate-400">{t('emptyCart')}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{localizedName(item, lang)}</p>
                      {item.modifiers.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.modifiers.map((mod, i) => (
                            <p key={i} className="text-xs text-slate-400">
                              {mod.is_note ? '- ' : '+ '}{localizedName(mod, lang)}
                              {!mod.is_note && Number(mod.price) > 0 && ` (+${Number(mod.price).toFixed(2)})`}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (item.printed && existingOrder) {
                          setVoidTarget(item);
                          setShowPinModal(true);
                        } else {
                          removeFromCart(item.id);
                        }
                      }}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium text-slate-700 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                      {item.printed && <Badge color="green" size="sm">{t('sentToKitchen')}</Badge>}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{formatPrice(item.line_total, settings)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Notes */}
          <div className="px-4 py-2 border-t border-slate-100">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('addNote')}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Totals + Actions */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>{t('subtotal')}</span>
                <span>{formatPrice(totals.subtotal, settings)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{t('discount')}</span>
                  <span>-{formatPrice(discount, settings)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>{t('tax')} ({settings?.tax_rate || 0}%)</span>
                  <span>{formatPrice(totals.taxAmount, settings)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 text-base pt-1.5 border-t border-slate-100">
                <span>{t('total')}</span>
                <span>{formatPrice(totals.total, settings)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={sendToKitchen}
                disabled={!canSendToKitchen || saving}
                fullWidth
              >
                {t('sendToKitchen')}
              </Button>
              <Button
                variant="success"
                onClick={() => setShowPayment(true)}
                disabled={!canPayOrder || saving}
                fullWidth
              >
                {t('pay')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      {customizingItem && (
        <ModifierModal
          cartItem={customizingItem}
          modifiers={modifiers.filter((m) => m.menu_item_id === customizingItem.menu_item_id)}
          lang={lang}
          onSave={applyCustomization}
          onClose={() => setCustomizingItem(null)}
        />
      )}

      {/* Payment Modal */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title={t('payment')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPayment(false)}>{t('cancel')}</Button>
            <Button variant="success" onClick={payOrder} disabled={saving}>
              {t('confirm')} - {formatPrice(totals.total, settings)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 mb-1">{t('total')}</p>
            <p className="text-3xl font-bold text-slate-800">{formatPrice(totals.total, settings)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium text-slate-800">{t('cash')}</p>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium text-slate-800">{t('card')}</p>
            </button>
          </div>
          <Input
            label={t('discount')}
            type="number"
            value={discount}
            onChange={(v) => setDiscount(Math.max(0, Number(v) || 0))}
          />
        </div>
      </Modal>

      {/* Void PIN Modal */}
      <Modal
        open={showPinModal}
        onClose={() => { setShowPinModal(false); setVoidTarget(null); setPinError(false); setManagerPin(''); }}
        title={t('confirmVoid')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowPinModal(false); setVoidTarget(null); setPinError(false); setManagerPin(''); }}>
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={handleVoid}>{t('confirm')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {voidTarget && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">
              {localizedName(voidTarget, lang)} x{voidTarget.quantity}
            </div>
          )}
          <Input
            label={t('voidReason')}
            value={voidReason}
            onChange={setVoidReason}
            placeholder={t('voidReason')}
          />
          <Input
            label={t('managerPin')}
            type="password"
            value={managerPin}
            onChange={(v) => { setManagerPin(v); setPinError(false); }}
            placeholder="****"
          />
          {pinError && (
            <p className="text-sm text-rose-500 flex items-center gap-1">
              <AlertCircle size={14} /> {t('wrongPin')}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ModifierModal({
  cartItem, modifiers, lang, onSave, onClose,
}: {
  cartItem: CartItem;
  modifiers: { id: string; name_ar: string; name_fr: string; price: number; is_note: boolean }[];
  lang: 'ar' | 'fr';
  onSave: (item: CartItem) => void;
  onClose: () => void;
}) {
  const { t, settings } = useApp();
  const [item, setItem] = useState<CartItem>({ ...cartItem });
  const [customNote, setCustomNote] = useState('');

  const toggleModifier = (mod: typeof modifiers[0]) => {
    const exists = item.modifiers.find((m) => m.name_ar === mod.name_ar);
    if (exists) {
      setItem({ ...item, modifiers: item.modifiers.filter((m) => m.name_ar !== mod.name_ar) });
    } else {
      setItem({
        ...item,
        modifiers: [...item.modifiers, {
          name_ar: mod.name_ar,
          name_fr: mod.name_fr,
          price: Number(mod.price),
          is_note: mod.is_note,
        }],
      });
    }
  };

  const addCustomNote = () => {
    if (!customNote.trim()) return;
    setItem({
      ...item,
      modifiers: [...item.modifiers, {
        name_ar: customNote,
        name_fr: customNote,
        price: 0,
        is_note: true,
      }],
    });
    setCustomNote('');
  };

  const paidModifiers = modifiers.filter((m) => !m.is_note);
  const noteModifiers = modifiers.filter((m) => m.is_note);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={localizedName(item, lang)}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(item)}>{t('addToCart')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Quantity */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
          <span className="text-sm font-medium text-slate-600">{t('quantity')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setItem({ ...item, quantity: Math.max(1, item.quantity - 1) })}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
            >
              <Minus size={16} />
            </button>
            <span className="font-bold text-slate-800 w-8 text-center">{item.quantity}</span>
            <button
              onClick={() => setItem({ ...item, quantity: item.quantity + 1 })}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Paid modifiers */}
        {paidModifiers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">{t('modifiers')}</p>
            <div className="space-y-2">
              {paidModifiers.map((mod) => {
                const selected = item.modifiers.some((m) => m.name_ar === mod.name_ar);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selected ? 'border-slate-800 bg-slate-50' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-sm text-slate-700">{localizedName(mod, lang)}</span>
                    <span className="text-sm font-medium text-slate-600">+{formatPrice(Number(mod.price), settings)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Free notes */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">{t('freeNotes')}</p>
          {noteModifiers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {noteModifiers.map((mod) => {
                const selected = item.modifiers.some((m) => m.name_ar === mod.name_ar);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod)}
                    className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                      selected ? 'border-slate-800 bg-slate-50 text-slate-800' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {localizedName(mod, lang)}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomNote()}
              placeholder={t('addNote')}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-slate-400"
            />
            <Button size="sm" onClick={addCustomNote}>{t('add')}</Button>
          </div>
        </div>

        {/* Selected modifiers summary */}
        {item.modifiers.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 space-y-1">
            {item.modifiers.map((mod, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {mod.is_note ? '- ' : '+ '}{localizedName(mod, lang)}
                </span>
                {!mod.is_note && Number(mod.price) > 0 && (
                  <span className="text-slate-500">+{formatPrice(mod.price, settings)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Line total */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 text-white">
          <span className="text-sm">{t('total')}</span>
          <span className="font-bold">
            {formatPrice(computeItemLineTotal(item.unit_price, item.quantity, item.modifiers), settings)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
