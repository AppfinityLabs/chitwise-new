'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Layers, CreditCard, Settings, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Layers, label: 'Chit Groups', href: '/groups' },
    { icon: Users, label: 'Members', href: '/members' },
    { icon: CreditCard, label: 'Collections', href: '/collections' },
    { icon: PieChart, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-screen sticky top-0 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col p-6">
            <div className="mb-10">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                    ChitWise
                </h1>
                <p className="text-xs text-slate-500 mt-1">Fund Management System</p>
            </div>

            <nav className="space-y-2 flex-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                                    isActive
                                        ? 'text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-xl border border-indigo-500/30"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-indigo-400" : "group-hover:text-indigo-300")} />
                                <span className="relative z-10 font-medium">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        AD
                    </div>
                    <div>
                        <p className="text-sm text-white font-medium">Admin User</p>
                        <p className="text-xs text-slate-500">Organiser</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
