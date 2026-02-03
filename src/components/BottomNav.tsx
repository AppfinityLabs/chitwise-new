'use client';

import { Home, Layers, Users, CreditCard, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 z-50 md:hidden pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1",
                                    isActive ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1",
                            isMenuOpen ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Menu size={20} strokeWidth={isMenuOpen ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Menu</span>
                    </button>
                </div>
            </div>

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
    );
}
