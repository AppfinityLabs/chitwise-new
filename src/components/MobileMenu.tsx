'use client';

import { Building2, PieChart, Settings, UserCog, LogOut, X, Bell, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const menuItems = [
    { icon: Trophy, label: 'Winners', href: '/winners' },
    { icon: Building2, label: 'Organisations', href: '/organisations' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: PieChart, label: 'Reports', href: '/reports' },
    { icon: UserCog, label: 'System Users', href: '/users' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await logout();
            onClose();
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
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/5 rounded-t-3xl z-[70] md:hidden overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />

                        <div className="p-4 flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400 text-sm font-bold">
                                    {user ? getUserInitials(user.name) : 'U'}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{user?.name || 'User'}</p>
                                    <p className="text-xs text-zinc-500 capitalize">{user?.role.replace('_', ' ').toLowerCase() || 'Role'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-zinc-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-1 overflow-y-auto">
                            {menuItems.filter(item => {
                                if (!user) return false;
                                if (user.role === 'SUPER_ADMIN') return true;
                                if (user.role === 'ORG_ADMIN') {
                                    return ['/reports'].includes(item.href);
                                }
                                return false;
                            }).map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all",
                                            isActive
                                                ? "bg-white/[0.06] text-indigo-400"
                                                : "text-zinc-300 hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon size={20} />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-white/5 mt-auto pb-8">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-medium"
                            >
                                <LogOut size={20} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
