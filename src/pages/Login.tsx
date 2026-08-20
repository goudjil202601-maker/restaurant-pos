import { useState, useEffect } from 'react';
import { Store, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Staff, StaffRole } from '@/lib/types';

export function Login() {
  const { t, lang, setLang, settings, staff, refreshAll } = useApp();
  const { login } = useAuth();
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleLogin = async () => {
    setError('');
    if (!selectedStaffId) {
      setError(lang === 'ar' ? 'يرجى اختيار المستخدم' : 'Veuillez choisir un utilisateur');
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('id', selectedStaffId)
        .maybeSingle();

      const staffMember = data as Staff | null;
      if (!staffMember) {
        setError(lang === 'ar' ? 'المستخدم غير موجود' : 'Utilisateur introuvable');
        return;
      }
      if (!staffMember.active) {
        setError(lang === 'ar' ? 'الحساب غير نشط' : 'Compte inactif');
        return;
      }
      if (staffMember.pin && staffMember.pin !== pin) {
        setError(t('wrongPin'));
        return;
      }
      login({
        id: staffMember.id,
        name: staffMember.name,
        role: staffMember.role as StaffRole,
      });
    } finally {
      setLoading(false);
    }
  };

  const activeStaff = staff.filter((s) => s.active);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
        className="fixed top-6 ltr:right-6 rtl:left-6 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        {lang === 'ar' ? 'Français' : 'العربية'}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 items-center justify-center mb-4 shadow-lg">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {settings?.restaurant_name || t('appName')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">POS System</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
          </h2>

          {/* Staff selection */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-slate-600">
              {lang === 'ar' ? 'اختر المستخدم' : 'Choisir un utilisateur'}
            </label>
            <div className="grid gap-2">
              {activeStaff.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  {lang === 'ar' ? 'لا يوجد موظفون. جاري التحميل...' : 'Aucun employé. Chargement...'}
                </p>
              ) : (
                activeStaff.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => { setSelectedStaffId(member.id); setPin(''); setError(''); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start ${
                      selectedStaffId === member.id
                        ? 'border-slate-800 bg-slate-50'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      member.role === 'manager' ? 'bg-violet-100 text-violet-600' :
                      member.role === 'cashier' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                      <p className="text-xs text-slate-400">
                        {member.role === 'manager' ? (lang === 'ar' ? 'مدير' : 'Manager') :
                         member.role === 'cashier' ? (lang === 'ar' ? 'كاشير' : 'Caissier') :
                         (lang === 'ar' ? 'نادل' : 'Serveur')}
                      </p>
                    </div>
                    {selectedStaffId === member.id && (
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                        <ArrowRight size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* PIN input */}
          {selectedStaffId && (
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-600">
                {t('pin')}
              </label>
              <div className="relative">
                <Lock size={18} className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-300" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="****"
                  className="w-full ltr:pl-10 rtl:pr-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/10 focus:border-slate-400 transition-all text-center text-lg tracking-widest"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-500 mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading || !selectedStaffId}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 active:bg-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('loading') : (lang === 'ar' ? 'دخول' : 'Se connecter')}
          </button>

          {/* Demo hint */}
          <div className="mt-6 p-3 rounded-xl bg-slate-50 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-500">
              {lang === 'ar' ? 'حسابات تجريبية:' : 'Comptes démo:'}
            </p>
            <p>{lang === 'ar' ? 'المدير: PIN 1234' : 'Manager: PIN 1234'}</p>
            <p>{lang === 'ar' ? 'الكاشير: PIN 1111' : 'Caissier: PIN 1111'}</p>
            <p>{lang === 'ar' ? 'النادل: PIN 2222' : 'Serveur: PIN 2222'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
