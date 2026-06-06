'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';

export default function SecuritySettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!loading && user && user.role !== 'SUPER_ADMIN') {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || (user && user.role !== 'SUPER_ADMIN')) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match');
            return;
        }

        setSaving(true);
        try {
            await authApi.changePassword(currentPassword, newPassword);
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
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
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><Shield size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Security</h1>
                    <p className="text-sm text-zinc-500">Update your account password</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Current Password</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>

                {error && <p className="text-sm text-rose-400">{error}</p>}
                {success && (
                    <p className="text-sm text-emerald-400 flex items-center gap-2">
                        <Check size={16} /> Password updated successfully
                    </p>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg transition-all active:scale-95"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                    <span>{saving ? 'Updating...' : 'Update Password'}</span>
                </button>
            </form>
        </div>
    );
}
