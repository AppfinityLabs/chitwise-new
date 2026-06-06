'use client';

import { Settings, Shield, Bell, ChevronRight } from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

const SETTINGS_SECTIONS = [
    {
        href: '/settings/security',
        title: 'Security',
        description: 'Manage password and access controls',
        icon: Shield,
        accent: 'bg-indigo-500/10 text-indigo-400',
    },
    {
        href: '/settings/notifications',
        title: 'Notifications',
        description: 'Configure email and SMS alerts',
        icon: Bell,
        accent: 'bg-emerald-500/10 text-emerald-400',
    },
    {
        href: '/settings/preferences',
        title: 'System Preferences',
        description: 'Date formats, currency, and language',
        icon: Settings,
        accent: 'bg-violet-500/10 text-violet-400',
    },
];

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
                {SETTINGS_SECTIONS.map((section, idx) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={section.href}
                            href={section.href}
                            className={`p-6 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-4 ${idx < SETTINGS_SECTIONS.length - 1 ? 'border-b border-white/5' : ''
                                }`}
                        >
                            <div className={`p-3 rounded-xl ${section.accent}`}>
                                <Icon size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{section.title}</h3>
                                <p className="text-sm text-zinc-500">{section.description}</p>
                            </div>
                            <ChevronRight size={20} className="text-zinc-600" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
