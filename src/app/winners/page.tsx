'use client';

import Link from 'next/link';
import { Plus, Trophy, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWinners, useGroups, invalidateAfterWinnerCreate } from '@/lib/swr';
import { winnersApi } from '@/lib/api';
import { useState } from 'react';

export default function WinnersPage() {
    const { user } = useAuth();
    const { data: winners, isLoading } = useWinners();
    const { data: groups } = useGroups();
    const [selectedGroup, setSelectedGroup] = useState('');
    const [search, setSearch] = useState('');

    const list = Array.isArray(winners) ? winners : [];

    const filtered = list.filter((w: any) => {
        const matchesGroup = !selectedGroup || w.groupId?._id === selectedGroup;
        const matchesSearch = !search ||
            w.memberId?.name?.toLowerCase().includes(search.toLowerCase()) ||
            w.groupId?.groupName?.toLowerCase().includes(search.toLowerCase());
        return matchesGroup && matchesSearch;
    });

    const totalDisbursed = filtered.reduce((sum: number, w: any) => sum + (w.prizeAmount || 0), 0);

    const handleDelete = async (id: string, status: string) => {
        if (status === 'PAID') {
            alert('Cannot delete a winner that has already been paid out.');
            return;
        }
        if (!confirm('Are you sure you want to delete this winner record?')) return;
        try {
            await winnersApi.delete(id);
            await invalidateAfterWinnerCreate();
        } catch (error: any) {
            alert(error.message || 'Failed to delete winner');
        }
    };

    const handleMarkPaid = async (id: string) => {
        if (!confirm('Mark this winner as PAID?')) return;
        try {
            await winnersApi.update(id, { status: 'PAID', payoutDate: new Date() });
            await invalidateAfterWinnerCreate();
        } catch (error: any) {
            alert(error.message || 'Failed to update winner');
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="text-amber-400" size={28} />
                        Winners
                    </h1>
                    <p className="text-zinc-500 mt-1 text-sm">
                        Total Disbursed: <span className="text-amber-400 font-bold">₹ {totalDisbursed.toLocaleString('en-IN')}</span>
                    </p>
                </div>
                <Link href="/winners/new" className="primary-btn px-6 py-2 flex items-center justify-center gap-2 w-full md:w-auto">
                    <Plus size={18} />
                    <span>Declare Winner</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by member or group name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                    />
                </div>
                <select
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                    className="bg-zinc-900/50 border border-white/10 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:border-indigo-500/50"
                >
                    <option value="">All Groups</option>
                    {(groups || []).map((g: any) => (
                        <option key={g._id} value={g._id}>{g.groupName}</option>
                    ))}
                </select>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 text-zinc-200 font-medium border-b border-white/5">
                        <tr>
                            <th className="p-4">Member</th>
                            <th className="p-4">Group</th>
                            {user?.role === 'SUPER_ADMIN' && <th className="p-4">Org</th>}
                            <th className="p-4">Period</th>
                            <th className="p-4">Method</th>
                            <th className="p-4 text-right">Prize Amount</th>
                            <th className="p-4 text-right">Commission</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Payout Date</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b border-white/5">
                                    <td className="p-4"><div className="skeleton h-4 w-24 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-28 rounded" /></td>
                                    {user?.role === 'SUPER_ADMIN' && <td className="p-4"><div className="skeleton h-4 w-12 rounded" /></td>}
                                    <td className="p-4"><div className="skeleton h-4 w-8 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-16 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-20 rounded ml-auto" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
                                    <td className="p-4"><div className="skeleton h-5 w-16 rounded-full" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-20 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-20 rounded" /></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-12 text-center text-zinc-500">
                                    <Trophy className="mx-auto mb-3 text-zinc-700" size={40} />
                                    <p>No winners declared yet</p>
                                    <Link href="/winners/new" className="text-indigo-400 hover:underline text-sm mt-1 inline-block">
                                        Declare the first winner →
                                    </Link>
                                </td>
                            </tr>
                        ) : filtered.map((w: any) => (
                            <tr key={w._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 font-medium text-white">{w.memberId?.name || '—'}</td>
                                <td className="p-4">{w.groupId?.groupName || '—'}</td>
                                {user?.role === 'SUPER_ADMIN' && (
                                    <td className="p-4">
                                        <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md border border-white/10">
                                            {w.groupId?.organisationId?.code || '—'}
                                        </span>
                                    </td>
                                )}
                                <td className="p-4">#{w.basePeriodNumber}</td>
                                <td className="p-4">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${w.selectionMethod === 'AUCTION'
                                        ? 'bg-violet-500/10 text-violet-400'
                                        : 'bg-blue-500/10 text-blue-400'
                                        }`}>
                                        {w.selectionMethod}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold text-amber-400">₹ {w.prizeAmount?.toLocaleString('en-IN')}</td>
                                <td className="p-4 text-right text-zinc-400">₹ {w.commissionEarned?.toLocaleString('en-IN')}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${w.status === 'PAID'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : w.status === 'FORFEITED'
                                            ? 'bg-rose-500/10 text-rose-400'
                                            : 'bg-amber-500/10 text-amber-400'
                                        }`}>
                                        {w.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm">
                                    {w.payoutDate ? new Date(w.payoutDate).toLocaleDateString() : '—'}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {w.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleMarkPaid(w._id)}
                                                className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                        {w.status !== 'PAID' && (
                                            <button
                                                onClick={() => handleDelete(w._id, w.status)}
                                                className="text-xs px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
