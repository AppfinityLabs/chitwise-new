'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2 } from 'lucide-react';

export default function CollectionsPage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/collections')
            .then((res) => res.json())
            .then((data) => {
                setCollections(data);
                setLoading(false);
            });
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Collections</h1>
                <Link href="/collections/new" className="primary-btn px-6 py-2 flex items-center gap-2">
                    <Plus size={18} />
                    <span>Record Payment</span>
                </Link>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 text-slate-200 font-medium border-b border-white/5">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Member</th>
                            <th className="p-4">Group</th>
                            <th className="p-4">Period</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4">Mode</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></td></tr>
                        ) : collections.map((col) => (
                            <tr key={col._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4">{new Date(col.periodDate).toLocaleDateString()}</td>
                                <td className="p-4 font-medium text-white">{col.memberId?.name}</td>
                                <td className="p-4">{col.groupId?.groupName || '...'}</td>
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
