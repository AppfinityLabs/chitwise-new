'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Layers, ChevronRight } from 'lucide-react';
import { memberFetcher } from '@/lib/memberApi';
import { Card, EmptyState, ListSkeleton, StatusBadge, PageHeader, formatINR } from '@/components/member/ui';

interface Subscription {
    _id: string;
    units: number;
    collectionPattern: string;
    totalCollected: number;
    pendingAmount: number;
    overdueAmount: number;
    paymentStatus: string;
    status: string;
    groupId: {
        _id: string;
        groupName: string;
        frequency: string;
        contributionAmount: number;
        currentPeriod: number;
        totalPeriods: number;
        status: string;
    } | null;
}

export default function MemberGroupsPage() {
    const { data, isLoading } = useSWR<Subscription[]>('/api/member/groups', memberFetcher);

    return (
        <div>
            <PageHeader title="My Groups" subtitle="Chit groups you are enrolled in" />

            {isLoading ? (
                <ListSkeleton rows={4} />
            ) : !data?.length ? (
                <EmptyState icon={<Layers className="h-8 w-8" />} title="No groups yet" subtitle="You haven't been enrolled in any chit group." />
            ) : (
                <div className="space-y-3">
                    {data.map((sub) => {
                        const g = sub.groupId;
                        if (!g) return null;
                        const progress = g.totalPeriods ? Math.min(100, Math.round((g.currentPeriod / g.totalPeriods) * 100)) : 0;
                        return (
                            <Link key={sub._id} href={`/m/groups/${g._id}`}>
                                <Card>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-white">{g.groupName}</p>
                                            <p className="mt-0.5 text-xs text-zinc-500">
                                                {g.frequency} · {formatINR(g.contributionAmount)}/period · {sub.units} unit{sub.units !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
                                    </div>

                                    <div className="mt-3">
                                        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                                            <span>Period {g.currentPeriod}/{g.totalPeriods}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-[11px] text-zinc-500">Paid</p>
                                                <p className="text-sm font-semibold text-emerald-400">{formatINR(sub.totalCollected)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-zinc-500">Overdue</p>
                                                <p className={`text-sm font-semibold ${sub.overdueAmount > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{formatINR(sub.overdueAmount)}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={sub.overdueAmount > 0 ? 'OVERDUE' : sub.status} />
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
