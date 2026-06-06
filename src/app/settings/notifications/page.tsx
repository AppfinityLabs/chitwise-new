'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { settingsApi } from '@/lib/api';

interface NotificationSettings {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    notificationFromName: string;
    notificationReplyTo: string;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
            <div>
                <h3 className="font-medium text-white">{label}</h3>
                <p className="text-sm text-zinc-500">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}

export default function NotificationSettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [settings, setSettings] = useState<NotificationSettings | null>(null);
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
                    emailEnabled: !!data.emailEnabled,
                    smsEnabled: !!data.smsEnabled,
                    pushEnabled: !!data.pushEnabled,
                    notificationFromName: data.notificationFromName || '',
                    notificationReplyTo: data.notificationReplyTo || '',
                });
            })
            .catch((err) => setError(err.message || 'Failed to load settings'))
            .finally(() => setLoadingData(false));
    }, [loading, user]);

    if (loading || (user && user.role !== 'SUPER_ADMIN')) {
        return null;
    }

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

    return (
        <div className="max-w-2xl">
            <Link href="/settings" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6">
                <ArrowLeft size={16} /> Back to Settings
            </Link>

            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Bell size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Notifications</h1>
                    <p className="text-sm text-zinc-500">Choose how members and admins are notified</p>
                </div>
            </div>

            {loadingData || !settings ? (
                <div className="glass-card p-6 space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full rounded" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <Toggle
                            label="Push Notifications"
                            description="Send in-app and browser push alerts"
                            checked={settings.pushEnabled}
                            onChange={(v) => setSettings({ ...settings, pushEnabled: v })}
                        />
                        <Toggle
                            label="Email Notifications"
                            description="Send transactional emails to members and admins"
                            checked={settings.emailEnabled}
                            onChange={(v) => setSettings({ ...settings, emailEnabled: v })}
                        />
                        <Toggle
                            label="SMS Notifications"
                            description="Send SMS alerts for payments and reminders"
                            checked={settings.smsEnabled}
                            onChange={(v) => setSettings({ ...settings, smsEnabled: v })}
                        />
                    </div>

                    <div className="glass-card p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Sender Name</label>
                            <input
                                type="text"
                                value={settings.notificationFromName}
                                onChange={(e) => setSettings({ ...settings, notificationFromName: e.target.value })}
                                placeholder="ChitWise"
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Reply-To Email</label>
                            <input
                                type="email"
                                value={settings.notificationReplyTo}
                                onChange={(e) => setSettings({ ...settings, notificationReplyTo: e.target.value })}
                                placeholder="support@yourdomain.com"
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg transition-all active:scale-95"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
