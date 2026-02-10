'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign } from 'lucide-react';
import { useGroup, useSubscriptions } from '@/lib/swr';

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: group, isLoading: groupLoading } = useGroup(id);
    const { data: members } = useSubscriptions({ groupId: id });

    const memberList = Array.isArray(members) ? members : [];

    if (groupLoading) {
        return (
            <div className="space-y-8">
                <div className="skeleton h-5 w-32 rounded" />
                <div className="flex justify-between items-start">
                    <div className="space-y-3">
                        <div className="skeleton h-8 w-64 rounded" />
                        <div className="flex gap-3">
                            <div className="skeleton h-6 w-20 rounded-full" />
                            <div className="skeleton h-6 w-16 rounded-full" />
                        </div>
                    </div>
                    <div className="skeleton h-12 w-40 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="glass-card p-4 space-y-2"><div className="skeleton h-3 w-16 rounded" /><div className="skeleton h-6 w-20 rounded" /></div>)}
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl text-white font-bold">Group Not Found</h2>
                <Link href="/groups" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">Back to Groups</Link>
            </div>
        );
    }

    return (
        <div>
            <Link href="/groups" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Groups</span>
            </Link>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{group.groupName}</h1>
                    <div className="flex gap-3">
                        <span className="px-2 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300 border border-white/10">{group.frequency}</span>
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">{group.status}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-zinc-400 text-sm">Pot Value</p>
                    <p className="text-2xl font-bold text-white">₹ {(group.totalUnits * group.contributionAmount).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="glass-card p-4">
                            <p className="text-xs text-zinc-500 mb-1">Contribution</p>
                            <p className="text-lg font-bold text-white">₹ {group.contributionAmount}</p>
                        </div>
                        <div className="glass-card p-4">
                            <p className="text-xs text-zinc-500 mb-1">Total Units</p>
                            <p className="text-lg font-bold text-white">{group.totalUnits}</p>
                        </div>
                        <div className="glass-card p-4">
                            <p className="text-xs text-zinc-500 mb-1">Duration</p>
                            <p className="text-lg font-bold text-white">{group.totalPeriods} <span className="text-xs font-normal text-zinc-500">Periods</span></p>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Schedule</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {Array.from({ length: group.totalPeriods }).map((_, i) => {
                                const periodNum = i + 1;
                                const date = new Date(group.startDate);
                                if (group.frequency === 'WEEKLY') date.setDate(date.getDate() + (i * 7));
                                if (group.frequency === 'DAILY') date.setDate(date.getDate() + i);
                                if (group.frequency === 'MONTHLY') date.setMonth(date.getMonth() + i);

                                const isCurrent = periodNum === group.currentPeriod;
                                const isPast = periodNum < group.currentPeriod;

                                return (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${isCurrent ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent border-white/5'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? 'bg-indigo-500 text-white' : isPast ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {periodNum}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                                                    {date.toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${isPast ? 'text-emerald-400 bg-emerald-500/10' : isCurrent ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500'}`}>
                                                {isPast ? 'Completed' : isCurrent ? 'Active' : 'Upcoming'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 h-fit">
                    <h3 className="text-xl font-bold text-white mb-4">Members ({memberList.length})</h3>
                    <div className="space-y-4">
                        {memberList.map((sub: any) => (
                            <div key={sub._id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-white/5">
                                <div>
                                    <p className="text-white font-medium text-sm">{sub.memberId?.name}</p>
                                    <div className="flex gap-2 text-xs text-zinc-500">
                                        <span>{sub.units} Unit(s)</span>
                                        <span>•</span>
                                        <span className={sub.overdueAmount > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                                            {sub.overdueAmount > 0 ? `Due: ₹${sub.overdueAmount}` : "All Clear"}
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${sub.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                            </div>
                        ))}
                    </div>
                    <Link
                        href={`/groups/${group._id}/add-member`}
                        className="block w-full text-center mt-6 py-2 rounded-xl border border-dashed border-white/20 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                        + Add Member
                    </Link>
                </div>
            </div>
        </div>
    );
}
