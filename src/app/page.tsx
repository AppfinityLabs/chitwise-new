'use client';

import DashboardStats from '@/components/DashboardStats';
import { Plus, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div>
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-slate-400">Welcome back, update your collections today.</p>
                </div>
                <div className="flex gap-4">
                    <Link href="/groups/new" className="primary-btn px-6 py-2 flex items-center gap-2">
                        <Plus size={18} />
                        <span>New Group</span>
                    </Link>
                </div>
            </header>

            <DashboardStats data={data} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area - Recent Collections */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Recent Collections</h2>
                            <Link href="/collections" className="text-sm text-indigo-400 hover:text-indigo-300">View All</Link>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8"><Loader2 className="animate-spin text-indigo-500 mx-auto" /></div>
                            ) : data?.recentCollections?.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No collections yet.</p>
                            ) : (
                                data?.recentCollections?.map((col: any) => (
                                    <div key={col._id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-900/60 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm">
                                                {col.memberId?.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{col.memberId?.name}</p>
                                                <p className="text-xs text-slate-400">{col.groupId?.groupName} • Period {col.basePeriodNumber}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white">₹ {col.amountPaid}</p>
                                            <p className="text-xs text-emerald-400">Paid via {col.paymentMode}</p>
                                        </div>
                                    </div>
                                )))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Area - Pending Dues */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Top Pending Dues</h2>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8"><Loader2 className="animate-spin text-indigo-500 mx-auto" /></div>
                            ) : data?.pendingDuesList?.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No pending dues!</p>
                            ) : (
                                data?.pendingDuesList?.map((item: any) => (
                                    <div key={item._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="text-slate-300 group-hover:text-white transition-colors">{item.memberId?.name}</span>
                                        </div>
                                        <span className="text-rose-400 font-medium text-sm">₹ {item.pendingAmount}</span>
                                    </div>
                                )))}
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm font-medium border border-white/5">
                            View All Pending
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
