'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Layers, CreditCard, Settings, PieChart, Building2, LogOut, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Layers, label: 'Chit Groups', href: '/groups' },
    { icon: Users, label: 'Members', href: '/members' },
    { icon: CreditCard, label: 'Collections', href: '/collections' },
    { icon: Building2, label: 'Organisations', href: '/organisations' },
    { icon: PieChart, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: UserCog, label: 'System Users', href: '/users' },
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
        <aside className="w-64 h-screen sticky top-0 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col p-6">
            <div className="mb-10">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                    ChitWise
                </h1>
                <p className="text-xs text-slate-500 mt-1">Fund Management System</p>
            </div>

            <nav className="space-y-2 flex-1">
                {menuItems.filter(item => {
                    if (!user) return false;
                    if (user.role === 'SUPER_ADMIN') return true;
                    if (user.role === 'ORG_ADMIN') {
                        return ['/', '/groups', '/members', '/collections', '/reports'].includes(item.href);
                    }
                    return false;
                }).map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                                    isActive
                                        ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 rounded-xl"
                                        transition={{ type: 'spring', duration: 0.6 }}
                                    />
                                )}
                                <item.icon className="w-5 h-5 relative z-10" />
                                <span className="relative z-10 font-medium">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                            {user ? getUserInitials(user.name) : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-slate-500 truncate capitalize">
                                {user?.role.replace('_', ' ').toLowerCase() || 'Role'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 group"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
