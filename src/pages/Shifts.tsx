import { useState, useMemo } from 'react';
import { Receipt, Play, Square, AlertCircle, Check, Printer, DollarSign } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, Input, StatCard, EmptyState, Modal } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Shift } from '@/lib/types';

export function Shifts() {
  const { t, lang, settings, shifts, orders, staff, refreshAll } = useApp();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('0');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [closingCash, setClosingCash] = useState('0');
  const [saving, setSaving] = useState(false);

  const currentShift = useMemo(() => shifts.find((s) => s.status === 'open') || null, [shifts]);

  const shiftOrders = useMemo(() => {
    if (!currentShift) return [];
    return orders.filter((o) => o.shift_id === currentShift.id && o.status === 'paid');
  }, [orders, currentShift]);

  const expectedCash = useMemo(() => {
    if (!currentShift) return 0;
    const cashSales = shiftOrders
      .filter((o) => o.payment_method === 'cash')
      .reduce((sum, o) => sum + Number(o.total), 0);
    return Number(currentShift.opening_cash) + cashSales;
  }, [currentShift, shiftOrders]);

  const cashDiff = Number(closingCash) - expectedCash;

  const openShift = async () => {
    setSaving(true);
    try {
      const shiftNumber = shifts.length + 1;
      const staffMember = staff.find((s) => s.id === selectedStaff);
      await supabase.from('shifts').insert({
        shift_number: shiftNumber,
        staff_id: selectedStaff || null,
        staff_name: staffMember?.name || null,
        opening_cash: Number(openingCash) || 0,
        status: 'open',
      });
      setShowOpenModal(false);
      setOpeningCash('0');
      setSelectedStaff('');
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const closeShift = async () => {
    if (!currentShift) return;
    setSaving(true);
    try {
      const totalSales = shiftOrders.reduce((sum, o) => sum + Number(o.total), 0);
      await supabase.from('shifts').update({
        status: 'closed',
        closing_cash: Number(closingCash) || 0,
        expected_cash: expectedCash,
        cash_difference: cashDiff,
        total_sales: totalSales,
        closed_at: new Date().toISOString(),
      }).eq('id', currentShift.id);
      setShowCloseModal(false);
      setClosingCash('0');
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Current shift status */}
      {currentShift ? (
        <>
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-300 text-sm">{t('shiftNumber')} {currentShift.shift_number}</p>
                <h2 className="text-2xl font-bold mt-1">{t('openShift')}</h2>
                <p className="text-slate-300 text-sm mt-1">
                  {currentShift.staff_name || '-'} · {formatDate(currentShift.opened_at, lang)}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Receipt size={28} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-xs text-slate-400">{t('openingCash')}</p>
                <p className="text-lg font-bold">{formatPrice(Number(currentShift.opening_cash), settings)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('totalSales')}</p>
                <p className="text-lg font-bold">{formatPrice(shiftOrders.reduce((s, o) => s + Number(o.total), 0), settings)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('orders')}</p>
                <p className="text-lg font-bold">{shiftOrders.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('expectedCash')}</p>
                <p className="text-lg font-bold">{formatPrice(expectedCash, settings)}</p>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="danger" onClick={() => setShowCloseModal(true)}>
                <Square size={16} className="inline mr-1" />
                {t('closeShift')}
              </Button>
            </div>
          </Card>

          {/* Shift orders */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">{t('recentOrders')}</h3>
            {shiftOrders.length === 0 ? (
              <EmptyState icon={<Receipt size={24} />} title={t('noOrders')} />
            ) : (
              <div className="space-y-2">
                {shiftOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        #{order.order_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {order.table_label || order.customer_name || `#${order.order_number}`}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(order.created_at, lang)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={order.payment_method === 'cash' ? 'green' : 'blue'} size="sm">
                        {order.payment_method === 'cash' ? t('cash') : t('card')}
                      </Badge>
                      <span className="font-bold text-slate-800 text-sm">{formatPrice(order.total, settings)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-8">
          <EmptyState
            icon={<Receipt size={28} />}
            title={t('noShiftOpen')}
            message={t('enterOpeningCash')}
            action={
              <Button onClick={() => setShowOpenModal(true)}>
                <Play size={16} className="inline mr-1" />
                {t('startShift')}
              </Button>
            }
          />
        </Card>
      )}

      {/* Shift history */}
      {shifts.filter((s) => s.status === 'closed').length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">{t('shifts')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-100">
                  <th className="text-start py-2 px-3 font-medium">#</th>
                  <th className="text-start py-2 px-3 font-medium">{t('openedBy')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('openedAt')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('openingCash')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('totalSales')}</th>
                  <th className="text-start py-2 px-3 font-medium">{t('cashDifference')}</th>
                </tr>
              </thead>
              <tbody>
                {shifts.filter((s) => s.status === 'closed').slice(0, 10).map((shift) => (
                  <tr key={shift.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-700">{shift.shift_number}</td>
                    <td className="py-2 px-3 text-slate-500">{shift.staff_name || '-'}</td>
                    <td className="py-2 px-3 text-slate-500">{formatDate(shift.opened_at, lang)}</td>
                    <td className="py-2 px-3 text-slate-500">{formatPrice(Number(shift.opening_cash), settings)}</td>
                    <td className="py-2 px-3 text-slate-500">{formatPrice(Number(shift.total_sales), settings)}</td>
                    <td className="py-2 px-3">
                      <Badge color={Number(shift.cash_difference) === 0 ? 'green' : Number(shift.cash_difference) > 0 ? 'amber' : 'red'} size="sm">
                        {Number(shift.cash_difference) > 0 ? '+' : ''}{formatPrice(Number(shift.cash_difference), settings)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Open shift modal */}
      <Modal
        open={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title={t('openShift')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowOpenModal(false)}>{t('cancel')}</Button>
            <Button onClick={openShift} disabled={saving}>{t('startShift')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('staffName')}</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400"
            >
              <option value="">-</option>
              {staff.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({t(s.role)})</option>
              ))}
            </select>
          </div>
          <Input label={t('openingCash')} type="number" value={openingCash} onChange={setOpeningCash} />
        </div>
      </Modal>

      {/* Close shift modal */}
      <Modal
        open={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title={t('confirmCloseShift')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCloseModal(false)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={closeShift} disabled={saving}>{t('closeShift')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('expectedCash')}</span>
              <span className="font-bold text-slate-700">{formatPrice(expectedCash, settings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('totalSales')}</span>
              <span className="font-bold text-slate-700">{formatPrice(shiftOrders.reduce((s, o) => s + Number(o.total), 0), settings)}</span>
            </div>
          </div>
          <Input
            label={t('closingCash')}
            type="number"
            value={closingCash}
            onChange={setClosingCash}
          />
          {Number(closingCash) > 0 && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
              cashDiff === 0 ? 'bg-emerald-50 text-emerald-700' :
              cashDiff > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {cashDiff === 0 ? <Check size={16} /> : <AlertCircle size={16} />}
              {t('cashDifference')}: {cashDiff > 0 ? '+' : ''}{formatPrice(cashDiff, settings)}
              {cashDiff > 0 && ` (${t('differencePositive')})`}
              {cashDiff < 0 && ` (${t('differenceNegative')})`}
              {cashDiff === 0 && ` (${t('differenceZero')})`}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
