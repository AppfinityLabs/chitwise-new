'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, History, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
    { href: '/m/dashboard', label: 'Home', icon: Home },
    { href: '/m/groups', label: 'Groups', icon: Layers },
    { href: '/m/history', label: 'History', icon: History },
    { href: '/m/notifications', label: 'Alerts', icon: Bell },
    { href: '/m/profile', label: 'Profile', icon: User },
];

export default function MemberBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-zinc-950/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto flex max-w-lg items-stretch justify-around">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                                active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                            )}
                        >
                            <Icon className={cn('h-5 w-5', active && 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]')} />
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
