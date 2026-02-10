'use client';

import { Settings, Shield, Bell } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && user.role !== 'SUPER_ADMIN') {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || (user && user.role !== 'SUPER_ADMIN')) {
        return null; // Or a loading spinner
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

            <div className="glass-card p-0 overflow-hidden text-zinc-300">
                <div className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><Shield size={24} /></div>
                    <div>
                        <h3 className="font-bold text-white">Security</h3>
                        <p className="text-sm text-zinc-500">Manage password and access controls</p>
                    </div>
                </div>
                <div className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Bell size={24} /></div>
                    <div>
                        <h3 className="font-bold text-white">Notifications</h3>
                        <p className="text-sm text-zinc-500">Configure email and SMS alerts</p>
                    </div>
                </div>
                <div className="p-6 hover:bg-white/5 transition-colors cursor-pointer flex gap-4">
                    <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400"><Settings size={24} /></div>
                    <div>
                        <h3 className="font-bold text-white">System Preferences</h3>
                        <p className="text-sm text-zinc-500">Date formats, currency, and language</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
