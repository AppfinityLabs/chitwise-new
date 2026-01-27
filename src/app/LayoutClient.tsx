'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { loading } = useAuth();
    const isLoginPage = pathname === '/login';

    // Login page doesn't need sidebar or loading - render directly
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Show loading spinner only on protected pages
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    // Regular pages with sidebar
    return (
        <>
            <Sidebar />
            <main className="flex-1 h-screen overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </>
    );
}
