'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const formatINR = (n: number | undefined | null) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const formatDate = (d: string | Date | undefined | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (d: string | Date | undefined | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
    return (
        <div className="mb-5 flex items-start justify-between gap-3">
            <div>
                <h1 className="text-xl font-bold text-white">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
            </div>
            {right}
        </div>
    );
}

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    CLOSED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    DEFAULTED: 'bg-red-500/15 text-red-400 border-red-500/20',
    PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    OVERDUE: 'bg-red-500/15 text-red-400 border-red-500/20',
    DUE: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    NOT_STARTED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    INACTIVE: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

export function StatusBadge({ status }: { status: string }) {
    const cls = STATUS_STYLES[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';
    return (
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-2xl border border-white/5 bg-zinc-900/50 p-4 shadow-lg', className)}>
            {children}
        </div>
    );
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-12 text-center">
            {icon && <div className="mb-3 text-zinc-600">{icon}</div>}
            <p className="font-medium text-zinc-300">{title}</p>
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
    );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-800/60" />
            ))}
        </div>
    );
}
