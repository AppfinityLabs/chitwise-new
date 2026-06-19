'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ArrowDownCircle, Receipt } from 'lucide-react';
import { memberFetcher } from '@/lib/memberApi';
import { Card, EmptyState, ListSkeleton, PageHeader, formatINR, formatDateTime } from '@/components/member/ui';

interface PaymentsResponse {
    payments: Array<{
        _id: string;
        amountPaid: number;
        collectedAt: string;
        paymentMode: string;
        basePeriodNumber: number;
        collectionSequence: number;
        groupId?: { groupName?: string };
    }>;
    pagination: { page: number; limit: number; total: number; pages: number };
}

export default function MemberHistoryPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useSWR<PaymentsResponse>(`/api/member/payments?page=${page}&limit=50`, memberFetcher);

    return (
        <div>
            <PageHeader title="Payment History" subtitle={data ? `${data.pagination.total} payments` : undefined} />

            {isLoading && !data ? (
                <ListSkeleton rows={6} />
            ) : !data?.payments.length ? (
                <EmptyState icon={<Receipt className="h-8 w-8" />} title="No payments yet" subtitle="Your payment records will appear here." />
            ) : (
                <>
                    <div className="space-y-2.5">
                        {data.payments.map((p) => (
                            <Card key={p._id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                                        <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{p.groupId?.groupName || 'Payment'}</p>
                                        <p className="text-[11px] text-zinc-500">
                                            {formatDateTime(p.collectedAt)}
                                        </p>
                                        <p className="text-[11px] text-zinc-600">P{p.basePeriodNumber}·{p.collectionSequence} · {p.paymentMode}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-emerald-400">{formatINR(p.amountPaid)}</p>
                            </Card>
                        ))}
                    </div>

                    {data.pagination.pages > 1 && (
                        <div className="mt-5 flex items-center justify-between">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-zinc-500">Page {page} of {data.pagination.pages}</span>
                            <button
                                disabled={page >= data.pagination.pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
