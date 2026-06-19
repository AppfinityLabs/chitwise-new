'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Wallet, TrendingDown, AlertTriangle, Trophy, Layers, ChevronRight, ArrowDownCircle } from 'lucide-react';
import { memberFetcher } from '@/lib/memberApi';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { Card, EmptyState, ListSkeleton, StatusBadge, formatINR, formatDate } from '@/components/member/ui';

interface DashboardData {
    stats: {
        activeGroups: number;
        totalGroups: number;
        totalPaid: number;
        totalPending: number;
        totalOverdue: number;
        totalWins: number;
        totalPrizeAmount: number;
    };
    recentPayments: Array<{ _id: string; amountPaid: number; collectedAt: string; groupId?: { groupName?: string }; paymentMode: string }>;
    upcomingDues: Array<{ _id: string; groupName: string; groupId: string; units: number; pendingAmount: number; overdueAmount: number; nextDueAmount: number }>;
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
    return (
        <Card className="p-3.5">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-400">{label}</p>
        </Card>
    );
}

export default function MemberDashboardPage() {
    const { member } = useMemberAuth();
    const { data, isLoading } = useSWR<DashboardData>('/api/member/dashboard', memberFetcher);

    return (
        <div>
            <div className="mb-5">
                <p className="text-sm text-zinc-400">Welcome back,</p>
                <h1 className="text-xl font-bold text-white">{member?.name || 'Member'}</h1>
                {member?.organisationName && <p className="mt-0.5 text-xs text-zinc-500">{member.organisationName}</p>}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-800/60" />)}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={<Wallet className="h-5 w-5 text-emerald-400" />} label="Total Paid" value={formatINR(data?.stats.totalPaid)} accent="bg-emerald-500/15" />
                        <StatTile icon={<TrendingDown className="h-5 w-5 text-amber-400" />} label="Total Pending" value={formatINR(data?.stats.totalPending)} accent="bg-amber-500/15" />
                        <StatTile icon={<AlertTriangle className="h-5 w-5 text-red-400" />} label="Overdue Now" value={formatINR(data?.stats.totalOverdue)} accent="bg-red-500/15" />
                        <StatTile icon={<Layers className="h-5 w-5 text-indigo-400" />} label="Active Groups" value={String(data?.stats.activeGroups ?? 0)} accent="bg-indigo-500/15" />
                    </div>

                    {(data?.stats.totalWins ?? 0) > 0 && (
                        <Card className="mt-3 flex items-center justify-between border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <Trophy className="h-7 w-7 text-amber-400" />
                                <div>
                                    <p className="text-sm font-semibold text-white">{data?.stats.totalWins} Win{(data?.stats.totalWins ?? 0) > 1 ? 's' : ''}</p>
                                    <p className="text-xs text-zinc-400">Total prize {formatINR(data?.stats.totalPrizeAmount)}</p>
                                </div>
                            </div>
                            <Link href="/m/winners" className="text-amber-400"><ChevronRight className="h-5 w-5" /></Link>
                        </Card>
                    )}
                </>
            )}

            {/* Upcoming / Overdue Dues */}
            <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">Dues to clear</h2>
                    <Link href="/m/groups" className="text-xs text-indigo-400">View all</Link>
                </div>
                {isLoading ? (
                    <ListSkeleton rows={2} />
                ) : !data?.upcomingDues.length ? (
                    <EmptyState icon={<Wallet className="h-8 w-8" />} title="No overdue payments" subtitle="You're all caught up." />
                ) : (
                    <div className="space-y-3">
                        {data.upcomingDues.map((d) => (
                            <Link key={d._id} href={`/m/groups/${d.groupId}`}>
                                <Card className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-white">{d.groupName}</p>
                                        <p className="text-xs text-zinc-500">{d.units} unit{d.units !== 1 ? 's' : ''} · Pending {formatINR(d.pendingAmount)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-400">{formatINR(d.overdueAmount)}</p>
                                        <StatusBadge status="OVERDUE" />
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Recent Payments */}
            <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">Recent payments</h2>
                    <Link href="/m/history" className="text-xs text-indigo-400">View all</Link>
                </div>
                {isLoading ? (
                    <ListSkeleton rows={3} />
                ) : !data?.recentPayments.length ? (
                    <EmptyState icon={<ArrowDownCircle className="h-8 w-8" />} title="No payments yet" />
                ) : (
                    <div className="space-y-2.5">
                        {data.recentPayments.map((p) => (
                            <Card key={p._id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
                                        <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{p.groupId?.groupName || 'Payment'}</p>
                                        <p className="text-xs text-zinc-500">{formatDate(p.collectedAt)} · {p.paymentMode}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-emerald-400">{formatINR(p.amountPaid)}</p>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
