'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

function LayoutSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-zinc-950">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500/60 animate-[pulse_1.5s_ease-in-out_infinite]" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500/60 animate-[pulse_1.5s_ease-in-out_0.2s_infinite]" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500/60 animate-[pulse_1.5s_ease-in-out_0.4s_infinite]" />
                </div>
            </div>
        </div>
    );
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { loading } = useAuth();
    const isLoginPage = pathname === '/login';

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (loading) {
        return <LayoutSkeleton />;
    }

    return (
        <>
            <div className="hidden md:flex">
                <Sidebar />
            </div>

            <main className="flex-1 h-screen overflow-y-auto w-full pb-20 md:pb-0 bg-zinc-950">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>

            <BottomNav />
        </>
    );
}
