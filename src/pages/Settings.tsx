import { useState } from 'react';
import {
  Store, Printer as PrinterIcon, Users, Table as TableIcon, Bike,
  Plus, Trash2, Pencil, Check, AlertCircle, Power, Wifi, Usb, Bluetooth,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, Input, Select, Toggle, Modal, ConfirmModal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { sendToPrinter } from '@/lib/print';
import { formatPrice } from '@/lib/utils';
import type { Printer, Staff, RestaurantTable, Driver, DeliveryZone } from '@/lib/types';

type Tab = 'general' | 'printers' | 'staff' | 'tables' | 'delivery';

export function Settings() {
  const { t, lang, setLang, settings, printers, staff, tables, drivers, zones, refreshAll } = useApp();
  const [tab, setTab] = useState<Tab>('general');
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: string } | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'printing' | 'success'>>({});

  const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
    { id: 'general', label: t('generalSettings'), icon: Store },
    { id: 'printers', label: t('printerSettings'), icon: PrinterIcon },
    { id: 'staff', label: t('staffSettings'), icon: Users },
    { id: 'tables', label: t('tablesSettings'), icon: TableIcon },
    { id: 'delivery', label: t('deliverySettings'), icon: Bike },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from(deleteTarget.type).delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    await refreshAll();
  };

  const testPrint = async (printer: Printer) => {
    setTestStatus((s) => ({ ...s, [printer.id]: 'printing' }));
    await sendToPrinter(printer, [{ text: '*** TEST PRINT ***', bold: true, align: 'center' }, { text: printer.name, align: 'center' }, { text: new Date().toLocaleString(), align: 'center' }]);
    setTestStatus((s) => ({ ...s, [printer.id]: 'success' }));
    setTimeout(() => setTestStatus((s) => ({ ...s, [printer.id]: 'idle' })), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === tabItem.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {tab === 'general' && settings && (
        <GeneralSettings />
      )}

      {/* Printers */}
      {tab === 'printers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{t('printers')}</h3>
            <Button onClick={() => { setEditingPrinter(null); setShowPrinterModal(true); }}>
              <Plus size={16} className="inline mr-1" />
              {t('addPrinter')}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {printers.map((printer) => (
              <Card key={printer.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      {printer.connection_type === 'network' ? <Wifi size={20} /> :
                       printer.connection_type === 'usb' ? <Usb size={20} /> :
                       <Bluetooth size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{printer.name}</p>
                      <p className="text-xs text-slate-400">
                        {t(printer.connection_type)} · {t(printer.station)} · {printer.paper_width}mm
                      </p>
                    </div>
                  </div>
                  <Badge color={printer.active ? 'green' : 'slate'} size="sm">
                    {printer.active ? t('active') : t('inactive')}
                  </Badge>
                </div>
                {printer.ip_address && (
                  <p className="text-xs text-slate-400 mb-3">{printer.ip_address}:{printer.port}</p>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <Button size="sm" variant="secondary" onClick={() => testPrint(printer)} disabled={testStatus[printer.id] === 'printing'}>
                    {testStatus[printer.id] === 'printing' ? t('printingTest') :
                     testStatus[printer.id] === 'success' ? <><Check size={14} className="inline mr-1" />{t('testSent')}</> :
                     t('testPrint')}
                  </Button>
                  <button onClick={() => { setEditingPrinter(printer); setShowPrinterModal(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: printer.id, name: printer.name, type: 'printers' })} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
          {showPrinterModal && (
            <PrinterModal
              printer={editingPrinter}
              onClose={() => { setShowPrinterModal(false); setEditingPrinter(null); }}
              onSaved={async () => { setShowPrinterModal(false); setEditingPrinter(null); await refreshAll(); }}
            />
          )}
        </div>
      )}

      {/* Staff */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{t('staffSettings')}</h3>
            <Button onClick={() => { setEditingStaff(null); setShowStaffModal(true); }}>
              <Plus size={16} className="inline mr-1" />
              {t('addStaff')}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                      <Badge color={member.role === 'manager' ? 'purple' : member.role === 'cashier' ? 'blue' : 'slate'} size="sm">
                        {t(member.role === 'cashier' ? 'cashierRole' : member.role)}
                      </Badge>
                    </div>
                  </div>
                  <Badge color={member.active ? 'green' : 'slate'} size="sm">
                    {member.active ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <button onClick={() => { setEditingStaff(member); setShowStaffModal(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: member.id, name: member.name, type: 'staff' })} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
          {showStaffModal && (
            <StaffModal
              staff={editingStaff}
              onClose={() => { setShowStaffModal(false); setEditingStaff(null); }}
              onSaved={async () => { setShowStaffModal(false); setEditingStaff(null); await refreshAll(); }}
            />
          )}
        </div>
      )}

      {/* Tables */}
      {tab === 'tables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{t('tablesSettings')}</h3>
            <Button onClick={() => { setEditingTable(null); setShowTableModal(true); }}>
              <Plus size={16} className="inline mr-1" />
              {t('addTable')}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{table.label}</p>
                    <p className="text-xs text-slate-400">{table.seats} {t('seats')} · {table.zone || '-'}</p>
                  </div>
                  <Badge color={table.status === 'free' ? 'green' : table.status === 'occupied' ? 'amber' : 'slate'} size="sm">
                    {t(table.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <button onClick={() => { setEditingTable(table); setShowTableModal(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: table.id, name: table.label, type: 'restaurant_tables' })} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
          {showTableModal && (
            <TableModal
              table={editingTable}
              onClose={() => { setShowTableModal(false); setEditingTable(null); }}
              onSaved={async () => { setShowTableModal(false); setEditingTable(null); await refreshAll(); }}
            />
          )}
        </div>
      )}

      {/* Delivery */}
      {tab === 'delivery' && (
        <div className="space-y-6">
          {/* Drivers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{t('drivers')}</h3>
              <Button onClick={() => { setEditingDriver(null); setShowDriverModal(true); }}>
                <Plus size={16} className="inline mr-1" />
                {t('addDriver')}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {drivers.map((driver) => (
                <Card key={driver.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{driver.name}</p>
                      <p className="text-xs text-slate-400">{driver.phone || '-'}</p>
                    </div>
                    <Badge color={driver.active ? 'green' : 'slate'} size="sm">
                      {driver.active ? t('active') : t('inactive')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                    <button onClick={() => { setEditingDriver(driver); setShowDriverModal(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: driver.id, name: driver.name, type: 'drivers' })} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Zones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{t('deliveryZones')}</h3>
              <Button onClick={() => { setEditingZone(null); setShowZoneModal(true); }}>
                <Plus size={16} className="inline mr-1" />
                {t('addZone')}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <Card key={zone.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{lang === 'ar' ? zone.name_ar : zone.name_fr}</p>
                      <p className="text-xs text-slate-400">{formatPrice(Number(zone.delivery_fee), settings)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                    <button onClick={() => { setEditingZone(zone); setShowZoneModal(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: zone.id, name: zone.name_ar, type: 'delivery_zones' })} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {showDriverModal && (
            <DriverModal
              driver={editingDriver}
              onClose={() => { setShowDriverModal(false); setEditingDriver(null); }}
              onSaved={async () => { setShowDriverModal(false); setEditingDriver(null); await refreshAll(); }}
            />
          )}
          {showZoneModal && (
            <ZoneModal
              zone={editingZone}
              onClose={() => { setShowZoneModal(false); setEditingZone(null); }}
              onSaved={async () => { setShowZoneModal(false); setEditingZone(null); await refreshAll(); }}
            />
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('confirmDelete')}
        message={`${t('deleteWarning')}: ${deleteTarget?.name}`}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger
      />
    </div>
  );
}

function GeneralSettings() {
  const { t, lang, setLang, settings, refreshAll } = useApp();
  const [form, setForm] = useState({
    restaurant_name: settings?.restaurant_name || '',
    currency: settings?.currency || '',
    currency_symbol: settings?.currency_symbol || '',
    tax_rate: String(settings?.tax_rate || 0),
    phone: settings?.phone || '',
    address: settings?.address || '',
    footer_receipt: settings?.footer_receipt || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('settings').update({
        restaurant_name: form.restaurant_name,
        currency: form.currency,
        currency_symbol: form.currency_symbol,
        tax_rate: Number(form.tax_rate) || 0,
        phone: form.phone || null,
        address: form.address || null,
        footer_receipt: form.footer_receipt || null,
        language: lang,
        updated_at: new Date().toISOString(),
      }).eq('id', 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('restaurantName')} value={form.restaurant_name} onChange={(v) => setForm({ ...form, restaurant_name: v })} />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('language')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLang('ar')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                lang === 'ar' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t('arabic')}
            </button>
            <button
              onClick={() => setLang('fr')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                lang === 'fr' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t('french')}
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('currency')} value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
        <Input label={t('currencySymbol')} value={form.currency_symbol} onChange={(v) => setForm({ ...form, currency_symbol: v })} />
        <Input label={t('taxRate')} type="number" value={form.tax_rate} onChange={(v) => setForm({ ...form, tax_rate: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Input label={t('address')} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      </div>
      <Input label={t('receiptFooter')} value={form.footer_receipt} onChange={(v) => setForm({ ...form, footer_receipt: v })} />
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('loading') : t('save')}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check size={16} /> {t('settingsSaved')}
          </span>
        )}
      </div>
    </Card>
  );
}

function PrinterModal({ printer, onClose, onSaved }: { printer: Printer | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({
    name: printer?.name || '',
    connection_type: printer?.connection_type || 'network',
    ip_address: printer?.ip_address || '',
    port: String(printer?.port || 9100),
    paper_width: String(printer?.paper_width || 80),
    auto_cutter: printer?.auto_cutter ?? true,
    station: printer?.station || 'cashier',
    active: printer?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name,
        connection_type: form.connection_type,
        ip_address: form.ip_address || null,
        port: Number(form.port) || 9100,
        paper_width: Number(form.paper_width) || 80,
        auto_cutter: form.auto_cutter,
        station: form.station,
        active: form.active,
      };
      if (printer) {
        await supabase.from('printers').update(data).eq('id', printer.id);
      } else {
        await supabase.from('printers').insert(data);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={printer ? t('edit') : t('addPrinter')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSave} disabled={saving || !form.name}>{t('save')}</Button></>}>
      <div className="space-y-4">
        <Input label={t('printerName')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Select label={t('connectionType')} value={form.connection_type} onChange={(v) => setForm({ ...form, connection_type: v as Printer['connection_type'] })}
          options={[{ value: 'network', label: t('network') }, { value: 'usb', label: t('usb') }, { value: 'bluetooth', label: t('bluetooth') }]} />
        {form.connection_type === 'network' && (
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('ipAddress')} value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} placeholder="192.168.1.200" />
            <Input label={t('port')} type="number" value={form.port} onChange={(v) => setForm({ ...form, port: v })} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('printerStation')} value={form.station} onChange={(v) => setForm({ ...form, station: v as Printer['station'] })}
            options={[{ value: 'cashier', label: t('cashier') }, { value: 'kitchen', label: t('kitchen') }, { value: 'bar', label: t('bar') }, { value: 'label', label: t('label') }]} />
          <Input label={t('paperWidth')} type="number" value={form.paper_width} onChange={(v) => setForm({ ...form, paper_width: v })} />
        </div>
        <div className="flex items-center gap-6">
          <Toggle checked={form.auto_cutter} onChange={(v) => setForm({ ...form, auto_cutter: v })} label={t('autoCutter')} />
          <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={t('active')} />
        </div>
      </div>
    </Modal>
  );
}

function StaffModal({ staff, onClose, onSaved }: { staff: Staff | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({
    name: staff?.name || '',
    role: staff?.role || 'waiter',
    pin: staff?.pin || '',
    active: staff?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { name: form.name, role: form.role, pin: form.pin || null, active: form.active };
      if (staff) {
        await supabase.from('staff').update(data).eq('id', staff.id);
      } else {
        await supabase.from('staff').insert(data);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={staff ? t('edit') : t('addStaff')} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSave} disabled={saving || !form.name}>{t('save')}</Button></>}>
      <div className="space-y-4">
        <Input label={t('staffName')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Select label={t('role')} value={form.role} onChange={(v) => setForm({ ...form, role: v as Staff['role'] })}
          options={[{ value: 'manager', label: t('manager') }, { value: 'cashier', label: t('cashierRole') }, { value: 'waiter', label: t('waiter') }]} />
        <Input label={t('pin')} type="password" value={form.pin} onChange={(v) => setForm({ ...form, pin: v })} placeholder="****" />
        <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={t('active')} />
      </div>
    </Modal>
  );
}

function TableModal({ table, onClose, onSaved }: { table: RestaurantTable | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({
    label: table?.label || '',
    seats: String(table?.seats || 4),
    zone: table?.zone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { label: form.label, seats: Number(form.seats) || 4, zone: form.zone || null, sort_order: 0 };
      if (table) {
        await supabase.from('restaurant_tables').update(data).eq('id', table.id);
      } else {
        await supabase.from('restaurant_tables').insert({ ...data, status: 'free' });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={table ? t('edit') : t('addTable')} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSave} disabled={saving || !form.label}>{t('save')}</Button></>}>
      <div className="space-y-4">
        <Input label={t('tableLabel')} value={form.label} onChange={(v) => setForm({ ...form, label: v })} required />
        <Input label={t('seats')} type="number" value={form.seats} onChange={(v) => setForm({ ...form, seats: v })} />
        <Input label={t('zone')} value={form.zone} onChange={(v) => setForm({ ...form, zone: v })} />
      </div>
    </Modal>
  );
}

function DriverModal({ driver, onClose, onSaved }: { driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({ name: driver?.name || '', phone: driver?.phone || '', active: driver?.active ?? true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { name: form.name, phone: form.phone || null, active: form.active };
      if (driver) {
        await supabase.from('drivers').update(data).eq('id', driver.id);
      } else {
        await supabase.from('drivers').insert(data);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={driver ? t('edit') : t('addDriver')} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSave} disabled={saving || !form.name}>{t('save')}</Button></>}>
      <div className="space-y-4">
        <Input label={t('driverName')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Input label={t('phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={t('active')} />
      </div>
    </Modal>
  );
}

function ZoneModal({ zone, onClose, onSaved }: { zone: DeliveryZone | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({ name_ar: zone?.name_ar || '', name_fr: zone?.name_fr || '', delivery_fee: String(zone?.delivery_fee || 0) });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { name_ar: form.name_ar, name_fr: form.name_fr, delivery_fee: Number(form.delivery_fee) || 0 };
      if (zone) {
        await supabase.from('delivery_zones').update(data).eq('id', zone.id);
      } else {
        await supabase.from('delivery_zones').insert(data);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={zone ? t('edit') : t('addZone')} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSave} disabled={saving || !form.name_ar || !form.name_fr}>{t('save')}</Button></>}>
      <div className="space-y-4">
        <Input label={t('itemNameAr')} value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} required />
        <Input label={t('itemNameFr')} value={form.name_fr} onChange={(v) => setForm({ ...form, name_fr: v })} required />
        <Input label={t('deliveryFee')} type="number" value={form.delivery_fee} onChange={(v) => setForm({ ...form, delivery_fee: v })} />
      </div>
    </Modal>
  );
}
