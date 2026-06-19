'use client';

import { use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Calendar, Coins, Trophy, ArrowDownCircle, Users } from 'lucide-react';
import { memberFetcher } from '@/lib/memberApi';
import { Card, EmptyState, ListSkeleton, StatusBadge, formatINR, formatDate } from '@/components/member/ui';

interface GroupDetail {
    group: {
        _id: string;
        groupName: string;
        description?: string;
        frequency: string;
        contributionAmount: number;
        totalUnits: number;
        totalPeriods: number;
        currentPeriod: number;
        status: string;
        startDate: string;
        endDate: string;
        commissionValue: number;
        potValue: number;
        organisationName: string;
    };
    subscription: {
        units: number;
        collectionPattern: string;
        collectionFactor: number;
        joinDate: string;
        totalDue: number;
        totalCollected: number;
        pendingAmount: number;
        overdueAmount: number;
        paymentStatus: string;
        status: string;
    };
    payments: Array<{ _id: string; amountPaid: number; collectedAt: string; paymentMode: string; basePeriodNumber: number; collectionSequence: number }>;
    winners: Array<{ _id: string; basePeriodNumber: number; prizeAmount: number; memberId?: { name?: string }; payoutStatus?: string }>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl bg-zinc-900/60 p-3">
            <p className="text-[11px] text-zinc-500">{label}</p>
            <p className="mt-0.5 font-semibold text-white">{value}</p>
            {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
        </div>
    );
}

export default function MemberGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading } = useSWR<GroupDetail>(`/api/member/groups/${id}`, memberFetcher);

    return (
        <div>
            <Link href="/m/groups" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
                <ArrowLeft className="h-4 w-4" /> Groups
            </Link>

            {isLoading || !data ? (
                <ListSkeleton rows={5} />
            ) : (
                <>
                    <div className="mb-4">
                        <div className="flex items-start justify-between gap-2">
                            <h1 className="text-xl font-bold text-white">{data.group.groupName}</h1>
                            <StatusBadge status={data.group.status} />
                        </div>
                        {data.group.description && <p className="mt-1 text-sm text-zinc-400">{data.group.description}</p>}
                        <p className="mt-1 text-xs text-zinc-500">{data.group.organisationName}</p>
                    </div>

                    {/* Group summary */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <Stat label="Pot Value" value={formatINR(data.group.potValue)} sub={`${data.group.totalUnits} units`} />
                        <Stat label="Contribution" value={formatINR(data.group.contributionAmount)} sub={data.group.frequency} />
                        <Stat label="Period" value={`${data.group.currentPeriod} / ${data.group.totalPeriods}`} />
                        <Stat label="Commission" value={formatINR(data.group.commissionValue)} />
                    </div>

                    {/* My subscription */}
                    <h2 className="mb-2 mt-6 text-sm font-semibold text-zinc-300">My subscription</h2>
                    <Card>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[11px] text-zinc-500">Units</p>
                                <p className="font-semibold text-white">{data.subscription.units}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-zinc-500">Pay pattern</p>
                                <p className="font-semibold text-white">{data.subscription.collectionPattern}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-zinc-500">Total paid</p>
                                <p className="font-semibold text-emerald-400">{formatINR(data.subscription.totalCollected)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-zinc-500">Pending</p>
                                <p className="font-semibold text-amber-400">{formatINR(data.subscription.pendingAmount)}</p>
                            </div>
                        </div>
                        {data.subscription.overdueAmount > 0 && (
                            <div className="mt-3 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                                <span className="text-sm text-red-300">Overdue now</span>
                                <span className="font-bold text-red-400">{formatINR(data.subscription.overdueAmount)}</span>
                            </div>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                            <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(data.subscription.joinDate)}
                        </div>
                    </Card>

                    {/* Payment history */}
                    <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-sm font-semibold text-zinc-300">
                        <Coins className="h-4 w-4" /> Payment history
                    </h2>
                    {!data.payments.length ? (
                        <EmptyState icon={<ArrowDownCircle className="h-8 w-8" />} title="No payments recorded yet" />
                    ) : (
                        <div className="space-y-2">
                            {data.payments.map((p) => (
                                <Card key={p._id} className="flex items-center justify-between p-3">
                                    <div>
                                        <p className="text-sm font-medium text-white">{formatINR(p.amountPaid)}</p>
                                        <p className="text-[11px] text-zinc-500">
                                            P{p.basePeriodNumber}·{p.collectionSequence} · {p.paymentMode}
                                        </p>
                                    </div>
                                    <p className="text-xs text-zinc-500">{formatDate(p.collectedAt)}</p>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Winners / draws */}
                    <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-sm font-semibold text-zinc-300">
                        <Trophy className="h-4 w-4" /> Draw results
                    </h2>
                    {!data.winners.length ? (
                        <EmptyState icon={<Users className="h-8 w-8" />} title="No draws conducted yet" />
                    ) : (
                        <div className="space-y-2">
                            {data.winners.map((w) => (
                                <Card key={w._id} className="flex items-center justify-between p-3">
                                    <div>
                                        <p className="text-sm font-medium text-white">Period {w.basePeriodNumber}</p>
                                        <p className="text-[11px] text-zinc-500">{w.memberId?.name || 'Winner'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-amber-400">{formatINR(w.prizeAmount)}</p>
                                        {w.payoutStatus && <StatusBadge status={w.payoutStatus} />}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
