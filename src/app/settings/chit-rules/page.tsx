'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Check, Users, Trophy, Wallet, Percent, CalendarDays, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface OrgSettingsData {
    allowFractionalUnits: boolean;
    maxUnitsPerMember: number;
    defaultUnitsPerMember: number;
    allowMultipleWinnersPerPeriod: boolean;
    allowRepeatWinners: boolean;
    winnerSelectionMode: 'MANUAL' | 'LOTTERY' | 'AUCTION';
    allowAdvancePayment: boolean;
    allowPartialPayment: boolean;
    gracePeriodDays: number;
    commissionType: 'FIXED' | 'PERCENTAGE';
    defaultCommissionRate: number;
    defaultFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    defaultAllowCustomCollectionPattern: boolean;
    sendPaymentReminders: boolean;
    reminderDaysBefore: number;
    sendOverdueAlerts: boolean;
    sendWinnerAnnouncements: boolean;
}

const DEFAULT: OrgSettingsData = {
    allowFractionalUnits: true,
    maxUnitsPerMember: 0,
    defaultUnitsPerMember: 1,
    allowMultipleWinnersPerPeriod: false,
    allowRepeatWinners: false,
    winnerSelectionMode: 'MANUAL',
    allowAdvancePayment: false,
    allowPartialPayment: true,
    gracePeriodDays: 0,
    commissionType: 'FIXED',
    defaultCommissionRate: 5,
    defaultFrequency: 'WEEKLY',
    defaultAllowCustomCollectionPattern: false,
    sendPaymentReminders: true,
    reminderDaysBefore: 1,
    sendOverdueAlerts: true,
    sendWinnerAnnouncements: true,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

function Section({ icon: Icon, title, children, accent = 'text-indigo-400' }: {
    icon: any; title: string; children: React.ReactNode; accent?: string;
}) {
    return (
        <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <Icon size={18} className={accent} />
                <h2 className="text-base font-semibold text-white">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm text-zinc-300">{label}</p>
                {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function NumInput({ value, onChange, min = 0, max, suffix }: {
    value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
                className="w-20 bg-zinc-900/70 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
        </div>
    );
}

function SelectInput({ value, onChange, options }: {
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-zinc-900/70 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

export default function ChitRulesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [settings, setSettings] = useState<OrgSettingsData>(DEFAULT);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!loading && user && user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (loading || !user) return;
        fetch('/api/org-settings')
            .then(r => r.json())
            .then(data => {
                setSettings({ ...DEFAULT, ...data });
                setFetching(false);
            })
            .catch(() => setFetching(false));
    }, [loading, user]);

    const set = <K extends keyof OrgSettingsData>(key: K, value: OrgSettingsData[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/org-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-12">
            <Link href="/settings" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Settings</span>
            </Link>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Chit Rules</h1>
                    <p className="text-zinc-400 text-sm mt-1">Configure how chit groups behave for your organisation</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="primary-btn px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
                    {saved ? 'Saved' : 'Save Changes'}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
            )}

            <div className="space-y-6">

                {/* ── Member Enrollment ─────────────────────────── */}
                <Section icon={Users} title="Member Enrollment" accent="text-indigo-400">
                    <Row label="Allow Fractional Units" hint="Members can hold 0.5, 1.5 etc. units">
                        <Toggle checked={settings.allowFractionalUnits} onChange={v => set('allowFractionalUnits', v)} />
                    </Row>
                    <Row label="Max Units Per Member" hint="0 = unlimited">
                        <NumInput value={settings.maxUnitsPerMember} onChange={v => set('maxUnitsPerMember', v)} min={0} suffix="units" />
                    </Row>
                    <Row label="Default Units Per Member" hint="Pre-filled when adding a member">
                        <NumInput value={settings.defaultUnitsPerMember} onChange={v => set('defaultUnitsPerMember', v)} min={0.5} suffix="units" />
                    </Row>
                </Section>

                {/* ── Winner Selection ──────────────────────────── */}
                <Section icon={Trophy} title="Winner Selection" accent="text-amber-400">
                    <Row label="Allow Multiple Winners Per Period" hint="More than one member can win in the same period">
                        <Toggle checked={settings.allowMultipleWinnersPerPeriod} onChange={v => set('allowMultipleWinnersPerPeriod', v)} />
                    </Row>
                    <Row label="Allow Repeat Winners" hint="Same member can win more than once in the group">
                        <Toggle checked={settings.allowRepeatWinners} onChange={v => set('allowRepeatWinners', v)} />
                    </Row>
                    <Row label="Winner Selection Mode" hint="How winners are typically chosen">
                        <SelectInput
                            value={settings.winnerSelectionMode}
                            onChange={v => set('winnerSelectionMode', v as any)}
                            options={[
                                { value: 'MANUAL', label: 'Manual (Admin decides)' },
                                { value: 'LOTTERY', label: 'Lottery (Random draw)' },
                                { value: 'AUCTION', label: 'Auction (Highest bidder)' },
                            ]}
                        />
                    </Row>
                </Section>

                {/* ── Collections & Payments ────────────────────── */}
                <Section icon={Wallet} title="Collections & Payments" accent="text-emerald-400">
                    <Row label="Allow Advance Payment" hint="Members can pay for future periods before they arrive">
                        <Toggle checked={settings.allowAdvancePayment} onChange={v => set('allowAdvancePayment', v)} />
                    </Row>
                    <Row label="Allow Partial Payment" hint="Accept amounts less than the full due amount">
                        <Toggle checked={settings.allowPartialPayment} onChange={v => set('allowPartialPayment', v)} />
                    </Row>
                    <Row label="Grace Period" hint="Days after a period ends before marking as overdue">
                        <NumInput value={settings.gracePeriodDays} onChange={v => set('gracePeriodDays', v)} min={0} suffix="days" />
                    </Row>
                </Section>

                {/* ── Commission ────────────────────────────────── */}
                <Section icon={Percent} title="Commission" accent="text-violet-400">
                    <Row label="Commission Type" hint="How commission is calculated">
                        <SelectInput
                            value={settings.commissionType}
                            onChange={v => set('commissionType', v as any)}
                            options={[
                                { value: 'FIXED', label: 'Fixed Amount (₹ per period)' },
                                { value: 'PERCENTAGE', label: 'Percentage of Pot' },
                            ]}
                        />
                    </Row>
                    {settings.commissionType === 'PERCENTAGE' && (
                        <Row label="Default Commission Rate" hint="Percentage deducted from pot each period">
                            <NumInput value={settings.defaultCommissionRate} onChange={v => set('defaultCommissionRate', v)} min={0} max={100} suffix="%" />
                        </Row>
                    )}
                </Section>

                {/* ── Group Defaults ────────────────────────────── */}
                <Section icon={CalendarDays} title="Group Creation Defaults" accent="text-sky-400">
                    <Row label="Default Frequency" hint="Pre-selected frequency when creating a new group">
                        <SelectInput
                            value={settings.defaultFrequency}
                            onChange={v => set('defaultFrequency', v as any)}
                            options={[
                                { value: 'DAILY', label: 'Daily' },
                                { value: 'WEEKLY', label: 'Weekly' },
                                { value: 'MONTHLY', label: 'Monthly' },
                            ]}
                        />
                    </Row>
                    <Row label="Allow Custom Collection Pattern" hint="Default value for new groups — members can pay on a different schedule">
                        <Toggle checked={settings.defaultAllowCustomCollectionPattern} onChange={v => set('defaultAllowCustomCollectionPattern', v)} />
                    </Row>
                </Section>

                {/* ── Notifications ─────────────────────────────── */}
                <Section icon={Bell} title="Notifications" accent="text-rose-400">
                    <Row label="Payment Confirmation Alerts" hint="Notify members when a payment is recorded">
                        <Toggle checked={settings.sendPaymentReminders} onChange={v => set('sendPaymentReminders', v)} />
                    </Row>
                    {settings.sendPaymentReminders && (
                        <Row label="Reminder Days Before Due" hint="Days before period to send a reminder">
                            <NumInput value={settings.reminderDaysBefore} onChange={v => set('reminderDaysBefore', v)} min={0} suffix="days" />
                        </Row>
                    )}
                    <Row label="Overdue Alerts" hint="Notify admin when a member is overdue">
                        <Toggle checked={settings.sendOverdueAlerts} onChange={v => set('sendOverdueAlerts', v)} />
                    </Row>
                    <Row label="Winner Announcements" hint="Notify the winning member when declared">
                        <Toggle checked={settings.sendWinnerAnnouncements} onChange={v => set('sendWinnerAnnouncements', v)} />
                    </Row>
                </Section>

            </div>
        </div>
    );
}
