'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, User, Phone, Calendar, Coins } from 'lucide-react';

interface Member {
    _id: string;
    name: string;
    phone: string;
    status: string;
    joinDate: string;
    createdAt: string;
}

export default function MemberHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [member, setMember] = useState<Member | null>(null);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Parallel fetch for efficiency
        Promise.all([
            fetch(`/api/members/${id}`).then(res => {
                if (!res.ok) throw new Error('Member not found');
                return res.json();
            }),
            fetch(`/api/groupmembers?memberId=${id}`).then(res => res.json()),
            fetch(`/api/collections?memberId=${id}`).then(res => res.json())
        ])
            .then(([memberData, subsData, collsData]) => {
                setMember(memberData);
                setSubscriptions(subsData);
                setCollections(collsData);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
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

    // Calculate totals
    const totalPaid = collections.reduce((sum, col) => sum + (col.amountPaid || 0), 0);
    const totalPending = subscriptions.reduce((sum, sub) => sum + (sub.pendingAmount || 0), 0);

    return (
        <div>
            <Link href="/members" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Directory</span>
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{member.name}</h1>
                    <div className="flex items-center gap-4 text-slate-400 text-sm">
                        <span className="flex items-center gap-1"><Phone size={14} /> {member.phone}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">{member.status}</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-400">₹ {totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="text-right border-l border-white/10 pl-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Due</p>
                        <p className="text-xl font-bold text-rose-400">₹ {totalPending.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Subscriptions & Groups */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-4">Active Groups</h2>
                    {subscriptions.length === 0 ? (
                        <div className="glass-card p-6 text-center text-slate-500">No active groups.</div>
                    ) : (
                        subscriptions.map(sub => (
                            <div key={sub._id} className="glass-card p-4 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white">{sub.groupId?.groupName}</h3>
                                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md">{sub.collectionPattern}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                    <div>
                                        <p className="text-slate-500 text-xs">Units</p>
                                        <p className="text-white font-medium">{sub.units}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Pending</p>
                                        <p className="text-rose-400 font-medium">₹ {sub.pendingAmount}</p>
                                    </div>
                                </div>
                                {/* Progress Bar (Visual flair) */}
                                <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${Math.min(100, (sub.totalCollected / sub.totalDue) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs mt-1 text-slate-500">
                                    <span>Paid: ₹{sub.totalCollected}</span>
                                    <span>Total: ₹{sub.totalDue}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Payment History (Ledger) */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-4">Payment History</h2>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-900/50 text-slate-200 font-medium border-b border-white/5">
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
                                {collections.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center">No payment history found.</td></tr>
                                ) : collections.map(col => (
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
