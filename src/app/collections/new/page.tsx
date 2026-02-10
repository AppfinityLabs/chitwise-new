'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { useMembers } from '@/lib/swr';
import { collectionsApi, subscriptionsApi } from '@/lib/api';
import { invalidateAfterCollectionCreate } from '@/lib/swr';

export default function NewCollectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { data: members } = useMembers();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [error, setError] = useState('');

    const [selectedMember, setSelectedMember] = useState('');
    const [selectedSub, setSelectedSub] = useState<any>(null);

    const [formData, setFormData] = useState({
        basePeriodNumber: '',
        amountPaid: '',
        paymentMode: 'CASH',
        remarks: '',
        periodDate: new Date().toISOString().split('T')[0]
    });

    const memberList = Array.isArray(members) ? members : [];

    // Fetch Subscriptions when Member Selected
    useEffect(() => {
        if (selectedMember) {
            subscriptionsApi.list({ memberId: selectedMember }).then(setSubscriptions).catch(() => setSubscriptions([]));
        } else {
            setSubscriptions([]);
            setSelectedSub(null);
        }
    }, [selectedMember]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSub) return;
        setLoading(true);
        setError('');

        try {
            await collectionsApi.create({
                groupMemberId: selectedSub._id,
                ...formData,
                amountPaid: Number(formData.amountPaid)
            });
            await invalidateAfterCollectionCreate(selectedSub.groupId?._id);
            router.push('/collections');
        } catch (err: any) {
            setError(err.message || 'Failed to record collection');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Record Collection</h1>

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">

                {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Select Member</label>
                    <select
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedMember}
                        onChange={e => setSelectedMember(e.target.value)}
                        required
                    >
                        <option value="">-- Choose Member --</option>
                        {memberList.map((m: any) => (
                            <option key={m._id} value={m._id}>{m.name} ({m.phone})</option>
                        ))}
                    </select>
                </div>

                {selectedMember && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Select Group/Chit</label>
                        <select
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            onChange={e => {
                                const sub = subscriptions.find(s => s._id === e.target.value);
                                setSelectedSub(sub);
                                if (sub) {
                                    const amount = (sub.groupId.contributionAmount * sub.units) / sub.collectionFactor;
                                    setFormData(prev => ({ ...prev, amountPaid: String(amount) }));
                                }
                            }}
                            required
                        >
                            <option value="">-- Choose Group --</option>
                            {subscriptions.map(s => (
                                <option key={s._id} value={s._id}>
                                    {s.groupId?.groupName} - {s.units} Units ({s.collectionPattern})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedSub && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
                        <h4 className="font-bold text-indigo-400 mb-2">Subscription Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
                            <div>
                                <p className="text-zinc-500">Total Due</p>
                                <p>₹ {selectedSub.totalDue}</p>
                            </div>
                            <div>
                                <p className="text-zinc-500">Pending</p>
                                <p>₹ {selectedSub.pendingAmount}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Period Number</label>
                        <input
                            type="number"
                            name="basePeriodNumber"
                            value={formData.basePeriodNumber}
                            onChange={e => setFormData({ ...formData, basePeriodNumber: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 1"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Date</label>
                        <input
                            type="date"
                            name="periodDate"
                            value={formData.periodDate}
                            onChange={e => setFormData({ ...formData, periodDate: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Amount Paid</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3 text-zinc-500">₹</span>
                        <input
                            type="number"
                            name="amountPaid"
                            value={formData.amountPaid}
                            onChange={e => setFormData({ ...formData, amountPaid: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Payment Mode</label>
                    <select
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.paymentMode}
                        onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                    >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                </div>

                <div className="pt-4 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="primary-btn px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>Record Payment</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
