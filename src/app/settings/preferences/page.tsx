'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings as SettingsIcon, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { settingsApi } from '@/lib/api';

interface PreferenceSettings {
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    language: string;
    timezone: string;
}

const CURRENCIES = [
    { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
    { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
    { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
    { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
    { code: 'EUR', symbol: '€', label: 'Euro (€)' },
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'];

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ml', label: 'Malayalam' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ta', label: 'Tamil' },
];

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London'];

export default function PreferencesSettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [settings, setSettings] = useState<PreferenceSettings | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!loading && user && user.role !== 'SUPER_ADMIN') {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (loading || !user || user.role !== 'SUPER_ADMIN') return;
        settingsApi
            .get()
            .then((data) => {
                setSettings({
                    currency: data.currency || 'INR',
                    currencySymbol: data.currencySymbol || '₹',
                    dateFormat: data.dateFormat || 'DD/MM/YYYY',
                    language: data.language || 'en',
                    timezone: data.timezone || 'Asia/Kolkata',
                });
            })
            .catch((err) => setError(err.message || 'Failed to load settings'))
            .finally(() => setLoadingData(false));
    }, [loading, user]);

    if (loading || (user && user.role !== 'SUPER_ADMIN')) {
        return null;
    }

    const handleCurrencyChange = (code: string) => {
        if (!settings) return;
        const match = CURRENCIES.find((c) => c.code === code);
        setSettings({ ...settings, currency: code, currencySymbol: match?.symbol || settings.currencySymbol });
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            await settingsApi.update(settings);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = 'w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50';

    return (
        <div className="max-w-2xl">
            <Link href="/settings" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6">
                <ArrowLeft size={16} /> Back to Settings
            </Link>

            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400"><SettingsIcon size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-white">System Preferences</h1>
                    <p className="text-sm text-zinc-500">Currency, date format, language and timezone</p>
                </div>
            </div>

            {loadingData || !settings ? (
                <div className="glass-card p-6 space-y-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 w-full rounded" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Currency</label>
                            <select value={settings.currency} onChange={(e) => handleCurrencyChange(e.target.value)} className={inputClass}>
                                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Date Format</label>
                            <select value={settings.dateFormat} onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })} className={inputClass}>
                                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Language</label>
                            <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })} className={inputClass}>
                                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Timezone</label>
                            <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className={inputClass}>
                                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {error && <p className="text-sm text-rose-400">{error}</p>}
                    {success && (
                        <p className="text-sm text-emerald-400 flex items-center gap-2">
                            <Check size={16} /> Settings saved
                        </p>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-lg transition-all active:scale-95"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
