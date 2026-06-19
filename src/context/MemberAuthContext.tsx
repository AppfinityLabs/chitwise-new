'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { memberAuthApi, MemberMe } from '@/lib/memberApi';

interface MemberAuthContextType {
    member: MemberMe | null;
    loading: boolean;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    setMember: (m: MemberMe | null) => void;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

// Routes that don't require an authenticated member.
const PUBLIC_PATHS = ['/m/login', '/m/forgot-pin'];

export function MemberAuthProvider({ children }: { children: ReactNode }) {
    const [member, setMember] = useState<MemberMe | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    const fetchMember = useCallback(async () => {
        try {
            const data = await memberAuthApi.me();
            setMember(data);
        } catch {
            setMember(null);
            if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
                router.replace('/m/login');
            }
        } finally {
            setLoading(false);
        }
    }, [pathname, router]);

    const logout = useCallback(async () => {
        try {
            await memberAuthApi.logout();
        } catch {
            // ignore
        }
        setMember(null);
        router.replace('/m/login');
    }, [router]);

    useEffect(() => {
        if (isPublic) {
            setLoading(false);
            return;
        }
        fetchMember();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return (
        <MemberAuthContext.Provider value={{ member, loading, refresh: fetchMember, logout, setMember }}>
            {children}
        </MemberAuthContext.Provider>
    );
}

export function useMemberAuth() {
    const ctx = useContext(MemberAuthContext);
    if (!ctx) throw new Error('useMemberAuth must be used within a MemberAuthProvider');
    return ctx;
}
