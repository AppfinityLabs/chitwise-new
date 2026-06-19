'use client';

import { useState, useEffect } from 'react';
import { User, Mail, MapPin, Phone, Building2, LogOut, KeyRound, Loader2, Check, Download, Pencil } from 'lucide-react';
import PinInput from '@/components/member/PinInput';
import { memberApi, memberAuthApi, MemberApiError } from '@/lib/memberApi';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { Card, PageHeader } from '@/components/member/ui';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
}

export default function MemberProfilePage() {
    const { member, refresh, logout } = useMemberAuth();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', address: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    // change PIN
    const [showPin, setShowPin] = useState(false);
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSaving, setPinSaving] = useState(false);

    // install prompt
    const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (member) setForm({ name: member.name || '', email: member.email || '', address: member.address || '' });
    }, [member]);

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setInstallEvent(e as BeforeInstallPromptEvent); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const saveProfile = async () => {
        setSaving(true);
        setMsg('');
        try {
            await memberApi.profileUpdate(form);
            await refresh();
            setEditing(false);
            setMsg('Profile updated');
            setTimeout(() => setMsg(''), 2500);
        } catch (err) {
            setMsg(err instanceof MemberApiError ? err.message : 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const savePin = async () => {
        setPinError('');
        if (currentPin.length !== 4 || newPin.length !== 4) { setPinError('Enter 4-digit PINs'); return; }
        if (newPin !== confirmPin) { setPinError('New PINs do not match'); return; }
        setPinSaving(true);
        try {
            await memberAuthApi.changePin(currentPin, newPin);
            setShowPin(false);
            setCurrentPin(''); setNewPin(''); setConfirmPin('');
            setMsg('PIN changed successfully');
            setTimeout(() => setMsg(''), 2500);
        } catch (err) {
            setPinError(err instanceof MemberApiError ? err.message : 'Failed to change PIN');
        } finally {
            setPinSaving(false);
        }
    };

    const install = async () => {
        if (!installEvent) return;
        await installEvent.prompt();
        setInstallEvent(null);
    };

    return (
        <div>
            <PageHeader title="Profile" />

            <div className="mb-5 flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30">
                    {(member?.name || 'M').charAt(0).toUpperCase()}
                </div>
                <h2 className="mt-3 text-lg font-bold text-white">{member?.name}</h2>
                <p className="text-sm text-zinc-500">{member?.organisationName}</p>
            </div>

            {msg && (
                <div className="mb-4 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                    <Check className="h-4 w-4" /> {msg}
                </div>
            )}

            {/* Profile fields */}
            <Card className="mb-4">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-300">Details</h3>
                    {!editing && (
                        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-indigo-400">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                    )}
                </div>

                {!editing ? (
                    <div className="space-y-3">
                        <Row icon={<User className="h-4 w-4" />} label="Name" value={member?.name} />
                        <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={member?.phone} />
                        <Row icon={<Mail className="h-4 w-4" />} label="Email" value={member?.email || '—'} />
                        <Row icon={<MapPin className="h-4 w-4" />} label="Address" value={member?.address || '—'} />
                        <Row icon={<Building2 className="h-4 w-4" />} label="Organisation" value={member?.organisationName} />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
                        <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                        <div className="flex gap-2 pt-1">
                            <button onClick={saveProfile} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
                            </button>
                            <button onClick={() => { setEditing(false); if (member) setForm({ name: member.name, email: member.email || '', address: member.address || '' }); }} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Change PIN */}
            <Card className="mb-4">
                <button onClick={() => setShowPin((s) => !s)} className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-zinc-200"><KeyRound className="h-4 w-4 text-indigo-400" /> Change PIN</span>
                    <span className="text-xs text-zinc-500">{showPin ? 'Close' : 'Open'}</span>
                </button>
                {showPin && (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="mb-2 block text-center text-xs text-zinc-400">Current PIN</label>
                            <PinInput value={currentPin} onChange={setCurrentPin} autoFocus={false} />
                        </div>
                        <div>
                            <label className="mb-2 block text-center text-xs text-zinc-400">New PIN</label>
                            <PinInput value={newPin} onChange={setNewPin} autoFocus={false} />
                        </div>
                        <div>
                            <label className="mb-2 block text-center text-xs text-zinc-400">Confirm New PIN</label>
                            <PinInput value={confirmPin} onChange={setConfirmPin} autoFocus={false} />
                        </div>
                        {pinError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{pinError}</p>}
                        <button onClick={savePin} disabled={pinSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                            {pinSaving && <Loader2 className="h-4 w-4 animate-spin" />} Update PIN
                        </button>
                    </div>
                )}
            </Card>

            {installEvent && (
                <button onClick={install} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 py-3 text-sm font-medium text-indigo-300">
                    <Download className="h-4 w-4" /> Install ChitWise app
                </button>
            )}

            <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-medium text-red-400">
                <LogOut className="h-4 w-4" /> Log out
            </button>
        </div>
    );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-zinc-500">{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className="truncate text-sm text-white">{value}</p>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs text-zinc-400">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>
    );
}
