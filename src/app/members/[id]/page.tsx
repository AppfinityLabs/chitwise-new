'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMember, useSubscriptions, useCollections, invalidateAfterMemberCreate } from '@/lib/swr';
import { membersApi } from '@/lib/api';

export default function MemberHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: member, isLoading } = useMember(id);
    const { data: subscriptions } = useSubscriptions({ memberId: id });
    const { data: collections } = useCollections({ memberId: id });

    const subs = Array.isArray(subscriptions) ? subscriptions : [];
    const colls = Array.isArray(collections) ? collections : [];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="skeleton h-5 w-32 rounded" />
                <div className="flex justify-between items-start">
                    <div className="space-y-3">
                        <div className="skeleton h-8 w-48 rounded" />
                        <div className="skeleton h-4 w-32 rounded" />
                    </div>
                    <div className="flex gap-4">
                        <div className="skeleton h-12 w-28 rounded" />
                        <div className="skeleton h-12 w-28 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-4">{[1, 2].map(i => <div key={i} className="glass-card p-4 space-y-3"><div className="skeleton h-5 w-32 rounded" /><div className="skeleton h-4 w-full rounded" /></div>)}</div>
                    <div className="lg:col-span-2 glass-card p-4"><div className="skeleton h-64 w-full rounded" /></div>
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl text-white font-bold">Member Not Found</h2>
                <Link href="/members" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">Back to Directory</Link>
            </div>
        );
    }

    const totalPaid = colls.reduce((sum: number, col: any) => sum + (col.amountPaid || 0), 0);
    const totalPending = subs.reduce((sum: number, sub: any) => sum + (sub.pendingAmount || 0), 0);

    return (
        <div>
            <Link href="/members" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Directory</span>
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{member.name}</h1>
                    <div className="flex items-center gap-4 text-zinc-400 text-sm">
                        <span className="flex items-center gap-1"><Phone size={14} /> {member.phone}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">{member.status}</span>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <Link
                        href={`/members/${id}/edit`}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 border border-white/10 transition-colors"
                    >
                        <Pencil size={14} />
                        Edit
                    </Link>
                    <button
                        onClick={async () => {
                            if (!confirm('Are you sure you want to deactivate this member?')) return;
                            try {
                                await membersApi.delete(id);
                                await invalidateAfterMemberCreate();
                                router.push('/members');
                            } catch (err: any) {
                                alert(err.message || 'Failed to delete');
                            }
                        }}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2 border border-rose-500/20 transition-colors"
                    >
                        <Trash2 size={14} />
                        Deactivate
                    </button>
                    <div className="border-l border-white/10 pl-3 flex gap-4">
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-400">₹ {totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="text-right border-l border-white/10 pl-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Due</p>
                        <p className="text-xl font-bold text-rose-400">₹ {totalPending.toLocaleString()}</p>
                    </div>
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-4">Active Groups</h2>
                    {subs.length === 0 ? (
                        <div className="glass-card p-6 text-center text-zinc-500">No active groups.</div>
                    ) : (
                        subs.map((sub: any) => (
                            <div key={sub._id} className="glass-card p-4 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white">{sub.groupId?.groupName}</h3>
                                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">{sub.collectionPattern}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                    <div>
                                        <p className="text-zinc-500 text-xs">Units</p>
                                        <p className="text-white font-medium">{sub.units}</p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs">Pending</p>
                                        <p className="text-rose-400 font-medium">₹ {sub.pendingAmount}</p>
                                    </div>
                                </div>
                                <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (sub.totalCollected / sub.totalDue) * 100)}%` }} />
                                </div>
                                <div className="flex justify-between text-xs mt-1 text-zinc-500">
                                    <span>Paid: ₹{sub.totalCollected}</span>
                                    <span>Total: ₹{sub.totalDue}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-4">Payment History</h2>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-left text-sm text-zinc-400">
                            <thead className="bg-zinc-900/50 text-zinc-200 font-medium border-b border-white/5">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Group</th>
                                    <th className="p-4">Period</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4">Mode</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {colls.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center">No payment history found.</td></tr>
                                ) : colls.map((col: any) => (
                                    <tr key={col._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4">{new Date(col.periodDate).toLocaleDateString()}</td>
                                        <td className="p-4 text-white font-medium">{col.groupId?.groupName}</td>
                                        <td className="p-4">#{col.basePeriodNumber}</td>
                                        <td className="p-4 text-right font-bold text-emerald-400">₹ {col.amountPaid}</td>
                                        <td className="p-4 uppercase text-xs">{col.paymentMode}</td>
                                        <td className="p-4"><span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs font-bold">{col.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
