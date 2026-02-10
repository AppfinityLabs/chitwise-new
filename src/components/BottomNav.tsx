'use client';

import { Home, Layers, Users, CreditCard, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileMenu from './MobileMenu';

const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Layers, label: 'Groups', href: '/groups' },
    { icon: Users, label: 'Members', href: '/members' },
    { icon: CreditCard, label: 'Pay', href: '/collections' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.2 }}
                className="fixed bottom-5 left-4 right-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl z-50 md:hidden shadow-2xl shadow-black/40"
            >
                <div className="flex justify-around items-center h-14 px-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href} className="relative flex-1">
                                <motion.div
                                    className={cn(
                                        "flex flex-col items-center justify-center py-1.5 mx-0.5 rounded-xl transition-colors",
                                        isActive ? "text-indigo-400" : "text-zinc-500"
                                    )}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="bottomNavActive"
                                            className="absolute inset-0 bg-indigo-500/10 rounded-xl"
                                            transition={{ type: 'spring', duration: 0.5 }}
                                        />
                                    )}
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className="relative z-10" />
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.span
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-[10px] font-semibold relative z-10 mt-0.5"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </Link>
                        );
                    })}

                    <motion.button
                        onClick={() => setIsMenuOpen(true)}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                            "flex flex-col items-center justify-center py-1.5 flex-1",
                            isMenuOpen ? "text-indigo-400" : "text-zinc-500"
                        )}
                    >
                        <Menu size={20} strokeWidth={1.8} />
                    </motion.button>
                </div>
            </motion.div>

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
    );
}
