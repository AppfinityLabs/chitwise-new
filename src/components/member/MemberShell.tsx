'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import MemberBottomNav from '@/components/member/MemberBottomNav';
import { useMemberAuth } from '@/context/MemberAuthContext';

const FULLSCREEN_PATHS = ['/m/login', '/m/forgot-pin'];

function ShellSkeleton() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600" />
                <div className="flex gap-1">
                    <span className="h-2 w-2 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-indigo-500/60" />
                    <span className="h-2 w-2 animate-[pulse_1.5s_ease-in-out_0.2s_infinite] rounded-full bg-indigo-500/60" />
                    <span className="h-2 w-2 animate-[pulse_1.5s_ease-in-out_0.4s_infinite] rounded-full bg-indigo-500/60" />
                </div>
            </div>
        </div>
    );
}

export default function MemberShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { loading } = useMemberAuth();

    const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p));

    if (isFullscreen) {
        return <div className="min-h-screen w-full bg-zinc-950">{children}</div>;
    }

    if (loading) {
        return <ShellSkeleton />;
    }

    return (
        <div className="min-h-screen w-full bg-zinc-950">
            <main className="mx-auto w-full max-w-lg px-4 pb-24 pt-4">{children}</main>
            <MemberBottomNav />
        </div>
    );
}
