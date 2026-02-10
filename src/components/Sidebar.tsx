'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Layers, CreditCard, Settings, PieChart, Building2, LogOut, UserCog, Bell, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Layers, label: 'Chit Groups', href: '/groups' },
    { icon: Users, label: 'Members', href: '/members' },
    { icon: CreditCard, label: 'Collections', href: '/collections' },
    { icon: Trophy, label: 'Winners', href: '/winners' },
    { icon: Building2, label: 'Organisations', href: '/organisations' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: PieChart, label: 'Reports', href: '/reports' },
    { icon: UserCog, label: 'System Users', href: '/users' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await logout();
        }
    };

    const getUserInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className="w-64 h-screen sticky top-0 bg-zinc-950 border-r border-white/5 flex flex-col p-6">
            <div className="mb-10">
                <h1 className="text-2xl font-bold gradient-text">
                    ChitWise
                </h1>
                <p className="text-xs text-zinc-500 mt-1">Fund Management System</p>
            </div>

            <nav className="space-y-1 flex-1">
                {menuItems.filter(item => {
                    if (!user) return false;
                    if (user.role === 'SUPER_ADMIN') return true;
                    if (user.role === 'ORG_ADMIN') {
                        return ['/', '/groups', '/members', '/collections', '/winners', '/reports'].includes(item.href);
                    }
                    return false;
                }).map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative',
                                    isActive
                                        ? 'text-white'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white/[0.06] rounded-xl border border-white/[0.08]"
                                        transition={{ type: 'spring', duration: 0.5 }}
                                    />
                                )}
                                <item.icon className={cn("w-[18px] h-[18px] relative z-10", isActive && "text-indigo-400")} />
                                <span className="relative z-10 text-sm font-medium">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400 text-xs font-bold">
                            {user ? getUserInitials(user.name) : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate capitalize">
                                {user?.role.replace('_', ' ').toLowerCase() || 'Role'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
