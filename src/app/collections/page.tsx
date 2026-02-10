'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCollections } from '@/lib/swr';

export default function CollectionsPage() {
    const { user } = useAuth();
    const { data: collections, isLoading } = useCollections();

    const list = Array.isArray(collections) ? collections : [];

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Collections</h1>
                <Link href="/collections/new" className="primary-btn px-6 py-2 flex items-center justify-center gap-2 w-full md:w-auto">
                    <Plus size={18} />
                    <span>Record Payment</span>
                </Link>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 text-zinc-200 font-medium border-b border-white/5">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Member</th>
                            <th className="p-4">Group</th>
                            {user?.role === 'SUPER_ADMIN' && <th className="p-4">Org</th>}
                            <th className="p-4">Period</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4">Mode</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b border-white/5">
                                    <td className="p-4"><div className="skeleton h-4 w-20 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-24 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-28 rounded" /></td>
                                    {user?.role === 'SUPER_ADMIN' && <td className="p-4"><div className="skeleton h-4 w-12 rounded" /></td>}
                                    <td className="p-4"><div className="skeleton h-4 w-8 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-12 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-5 w-14 rounded-full" /></td>
                                </tr>
                            ))
                        ) : list.map((col: any) => (
                            <tr key={col._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4">{new Date(col.periodDate).toLocaleDateString()}</td>
                                <td className="p-4 font-medium text-white">{col.memberId?.name}</td>
                                <td className="p-4">{col.groupId?.groupName || '...'}</td>
                                {user?.role === 'SUPER_ADMIN' && (
                                    <td className="p-4">
                                        <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md border border-white/10">
                                            {col.groupId?.organisationId?.code || '-'}
                                        </span>
                                    </td>
                                )}
                                <td className="p-4">#{col.basePeriodNumber}</td>
                                <td className="p-4 text-right font-bold text-emerald-400">₹ {col.amountPaid}</td>
                                <td className="p-4">{col.paymentMode}</td>
                                <td className="p-4">
                                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-xs font-bold">
                                        {col.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
