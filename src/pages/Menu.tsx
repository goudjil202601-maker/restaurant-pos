import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed, Package, Eye, EyeOff } from 'lucide-react';
import { useApp } from '@/lib/context';
import { Card, Badge, Button, Input, Select, Toggle, EmptyState, Modal, ConfirmModal } from '@/components/ui';
import { localizedName, formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Category, MenuItem, Modifier } from '@/lib/types';

export function Menu() {
  const { t, lang, settings, categories, menuItems, modifiers, refreshMenu } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'item' | 'category' } | null>(null);
  const [showModifiers, setShowModifiers] = useState<MenuItem | null>(null);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter((m) => m.category_id === selectedCategory);
  }, [menuItems, selectedCategory]);

  const toggleAvailable = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id);
    await refreshMenu();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    await refreshMenu();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    await refreshMenu();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Category tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              !selectedCategory ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t('all')} ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter((m) => m.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {localizedName(cat, lang)} ({count})
              </button>
            );
          })}
          <button
            onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
            className="px-3 py-2 rounded-xl text-sm font-medium bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <Plus size={16} className="inline" />
          </button>
        </div>
        <Button onClick={() => { setEditingItem(null); setShowItemModal(true); }}>
          <Plus size={18} className="inline mr-1" />
          {t('addItem')}
        </Button>
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed size={28} />} title={t('noData')} message={t('addItem')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const cat = categories.find((c) => c.id === item.category_id);
            const itemModifiers = modifiers.filter((m) => m.menu_item_id === item.id);
            return (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{localizedName(item, lang)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{cat ? localizedName(cat, lang) : '-'}</p>
                  </div>
                  <Badge color={item.available ? 'green' : 'red'} size="sm">
                    {item.available ? t('available') : t('soldOut')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-slate-800">{formatPrice(Number(item.price), settings)}</span>
                  <Badge color="slate" size="sm">
                    {item.station === 'kitchen' ? t('kitchen') : t('bar')}
                  </Badge>
                </div>

                {itemModifiers.length > 0 && (
                  <p className="text-xs text-slate-400 mb-3">
                    {itemModifiers.length} {t('modifiers')}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.available
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {item.available ? <Eye size={14} /> : <EyeOff size={14} />}
                    {item.available ? t('available') : t('soldOut')}
                  </button>
                  <button
                    onClick={() => setShowModifiers(item)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                    title={t('modifiers')}
                  >
                    <Package size={16} />
                  </button>
                  <button
                    onClick={() => { setEditingItem(item); setShowItemModal(true); }}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: item.id, name: localizedName(item, lang), type: 'item' })}
                    className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          categories={categories}
          onClose={() => { setShowItemModal(false); setEditingItem(null); }}
          onSaved={async () => { setShowItemModal(false); setEditingItem(null); await refreshMenu(); }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
          onSaved={async () => { setShowCategoryModal(false); setEditingCategory(null); await refreshMenu(); }}
        />
      )}

      {/* Modifiers Modal */}
      {showModifiers && (
        <ModifiersModal
          item={showModifiers}
          modifiers={modifiers.filter((m) => m.menu_item_id === showModifiers.id)}
          onClose={() => setShowModifiers(null)}
          onSaved={async () => { setShowModifiers(null); await refreshMenu(); }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'item') deleteItem(deleteTarget.id);
          else deleteCategory(deleteTarget.id);
        }}
        title={t('confirmDelete')}
        message={`${t('deleteWarning')}: ${deleteTarget?.name}`}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger
      />
    </div>
  );
}

function ItemModal({ item, categories, onClose, onSaved }: {
  item: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useApp();
  const [nameAr, setNameAr] = useState(item?.name_ar || '');
  const [nameFr, setNameFr] = useState(item?.name_fr || '');
  const [price, setPrice] = useState(item?.price.toString() || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [station, setStation] = useState(item?.station || 'kitchen');
  const [available, setAvailable] = useState(item?.available ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name_ar: nameAr,
        name_fr: nameFr,
        price: Number(price) || 0,
        category_id: categoryId || null,
        station,
        available,
      };
      if (item) {
        await supabase.from('menu_items').update(data).eq('id', item.id);
      } else {
        await supabase.from('menu_items').insert({ ...data, sort_order: 0 });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={item ? t('editItem') : t('addItem')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !nameAr || !nameFr}>{t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('itemNameAr')} value={nameAr} onChange={setNameAr} required />
        <Input label={t('itemNameFr')} value={nameFr} onChange={setNameFr} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('price')} type="number" value={price} onChange={setPrice} required />
          <Select
            label={t('category')}
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: `${c.name_ar} / ${c.name_fr}` }))}
            placeholder={t('category')}
          />
        </div>
        <Select
          label={t('station')}
          value={station}
          onChange={setStation}
          options={[
            { value: 'kitchen', label: t('kitchen') },
            { value: 'bar', label: t('bar') },
          ]}
        />
        <Toggle checked={available} onChange={setAvailable} label={t('available')} />
      </div>
    </Modal>
  );
}

function CategoryModal({ category, onClose, onSaved }: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, categories } = useApp();
  const [nameAr, setNameAr] = useState(category?.name_ar || '');
  const [nameFr, setNameFr] = useState(category?.name_fr || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { name_ar: nameAr, name_fr: nameFr, sort_order: categories.length };
      if (category) {
        await supabase.from('categories').update(data).eq('id', category.id);
      } else {
        await supabase.from('categories').insert(data);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={category ? t('edit') : t('addCategory')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !nameAr || !nameFr}>{t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('itemNameAr')} value={nameAr} onChange={setNameAr} required />
        <Input label={t('itemNameFr')} value={nameFr} onChange={setNameFr} required />
      </div>
    </Modal>
  );
}

function ModifiersModal({ item, modifiers, onClose, onSaved }: {
  item: MenuItem;
  modifiers: Modifier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useApp();
  const [modifierList, setModifierList] = useState(modifiers);
  const [nameAr, setNameAr] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [price, setPrice] = useState('0');
  const [isNote, setIsNote] = useState(false);
  const [saving, setSaving] = useState(false);

  const addModifier = async () => {
    if (!nameAr || !nameFr) return;
    setSaving(true);
    try {
      const { data } = await supabase.from('modifiers').insert({
        menu_item_id: item.id,
        name_ar: nameAr,
        name_fr: nameFr,
        price: Number(price) || 0,
        is_note: isNote,
      }).select().maybeSingle();
      if (data) {
        setModifierList([...modifierList, data as Modifier]);
        setNameAr(''); setNameFr(''); setPrice('0'); setIsNote(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteModifier = async (id: string) => {
    await supabase.from('modifiers').delete().eq('id', id);
    setModifierList(modifierList.filter((m) => m.id !== id));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${t('modifiers')} - ${localizedName(item, lang)}`}
      size="lg"
      footer={<Button onClick={onClose}>{t('close')}</Button>}
    >
      <div className="space-y-4">
        {/* Existing modifiers */}
        {modifierList.length > 0 && (
          <div className="space-y-2">
            {modifierList.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-sm text-slate-700">{localizedName(mod, lang)}</span>
                  {mod.is_note ? (
                    <Badge color="slate" size="sm">{t('freeNotes')}</Badge>
                  ) : (
                    <span className="text-sm text-slate-500 ms-2">+{Number(mod.price).toFixed(2)}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteModifier(mod.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new modifier */}
        <div className="p-4 rounded-xl bg-slate-50 space-y-3">
          <p className="text-sm font-medium text-slate-600">{t('addModifier')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('itemNameAr')} value={nameAr} onChange={setNameAr} />
            <Input label={t('itemNameFr')} value={nameFr} onChange={setNameFr} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('modifierPrice')} type="number" value={price} onChange={setPrice} />
            <div className="flex items-end pb-2">
              <Toggle checked={isNote} onChange={setIsNote} label={t('isNote')} />
            </div>
          </div>
          <Button size="sm" onClick={addModifier} disabled={saving || !nameAr || !nameFr}>
            <Plus size={14} className="inline mr-1" />
            {t('add')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
