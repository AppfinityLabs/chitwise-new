'use client';

import useSWR from 'swr';
import { Trophy } from 'lucide-react';
import { memberFetcher } from '@/lib/memberApi';
import { Card, EmptyState, ListSkeleton, StatusBadge, PageHeader, formatINR, formatDate } from '@/components/member/ui';

interface Winner {
    _id: string;
    basePeriodNumber: number;
    prizeAmount: number;
    bidAmount?: number;
    drawType?: string;
    payoutStatus?: string;
    createdAt: string;
    groupId?: { groupName?: string; contributionAmount?: number; totalUnits?: number };
}

export default function MemberWinnersPage() {
    const { data, isLoading } = useSWR<Winner[]>('/api/member/winners', memberFetcher);

    const totalPrize = (data || []).reduce((s, w) => s + (w.prizeAmount || 0), 0);

    return (
        <div>
            <PageHeader title="My Wins" subtitle={data?.length ? `${data.length} win${data.length > 1 ? 's' : ''} · ${formatINR(totalPrize)}` : undefined} />

            {isLoading ? (
                <ListSkeleton rows={3} />
            ) : !data?.length ? (
                <EmptyState icon={<Trophy className="h-8 w-8" />} title="No wins yet" subtitle="When you win a chit draw, it will show here." />
            ) : (
                <div className="space-y-3">
                    {data.map((w) => (
                        <Card key={w._id} className="border-amber-500/15 bg-gradient-to-r from-amber-500/5 to-transparent">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
                                        <Trophy className="h-6 w-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{w.groupId?.groupName || 'Chit Group'}</p>
                                        <p className="text-xs text-zinc-500">Period {w.basePeriodNumber} · {formatDate(w.createdAt)}</p>
                                    </div>
                                </div>
                                {w.payoutStatus && <StatusBadge status={w.payoutStatus} />}
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                                <div>
                                    <p className="text-[11px] text-zinc-500">Prize amount</p>
                                    <p className="text-lg font-bold text-amber-400">{formatINR(w.prizeAmount)}</p>
                                </div>
                                {w.drawType && (
                                    <div className="text-right">
                                        <p className="text-[11px] text-zinc-500">{w.drawType}</p>
                                        {w.bidAmount ? <p className="text-xs text-zinc-400">Bid {formatINR(w.bidAmount)}</p> : null}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
