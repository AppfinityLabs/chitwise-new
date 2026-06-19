'use client';

import useSWR from 'swr';
import { Bell, BellRing } from 'lucide-react';
import { memberFetcher } from '@/lib/memberApi';
import { Card, EmptyState, ListSkeleton, PageHeader, formatDateTime } from '@/components/member/ui';

interface NotificationsResponse {
    notifications: Array<{
        _id: string;
        title: string;
        body: string;
        image?: string;
        url?: string;
        priority?: string;
        sentAt: string;
        targetType: string;
    }>;
    pagination: { page: number; limit: number; total: number; pages: number };
}

export default function MemberNotificationsPage() {
    const { data, isLoading } = useSWR<NotificationsResponse>('/api/member/notifications?page=1&limit=30', memberFetcher);

    return (
        <div>
            <PageHeader title="Notifications" />

            {isLoading ? (
                <ListSkeleton rows={5} />
            ) : !data?.notifications.length ? (
                <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" subtitle="Updates from your organisation will appear here." />
            ) : (
                <div className="space-y-3">
                    {data.notifications.map((n) => {
                        const content = (
                            <Card className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
                                    <BellRing className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white">{n.title}</p>
                                    <p className="mt-0.5 text-sm text-zinc-400">{n.body}</p>
                                    <p className="mt-1.5 text-[11px] text-zinc-600">{formatDateTime(n.sentAt)}</p>
                                </div>
                            </Card>
                        );
                        return n.url ? (
                            <a key={n._id} href={n.url} target="_blank" rel="noopener noreferrer">{content}</a>
                        ) : (
                            <div key={n._id}>{content}</div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
