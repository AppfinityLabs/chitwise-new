'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Search } from 'lucide-react';

export default function NewCollectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
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

    // Fetch Members on load
    useEffect(() => {
        fetch('/api/members').then(res => res.json()).then(setMembers);
    }, []);

    // Fetch Subscriptions when Member Selected
    useEffect(() => {
        if (selectedMember) {
            fetch(`/api/groupmembers?memberId=${selectedMember}`)
                .then(res => res.json())
                .then(setSubscriptions);
        } else {
            setSubscriptions([]);
            setSelectedSub(null);
        }
    }, [selectedMember]);

    // ... (rest of effects)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSub) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupMemberId: selectedSub._id,
                    ...formData,
                    amountPaid: Number(formData.amountPaid)
                }),
            });

            if (res.ok) {
                router.push('/collections');
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to record collection');
            }
        } catch (err) {
            console.error(err);
            setError('Error recording collection');
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

                {/* Member Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Select Member</label>
                    <select
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedMember}
                        onChange={e => setSelectedMember(e.target.value)}
                        required
                    >
                        <option value="">-- Choose Member --</option>
                        {members.map(m => (
                            <option key={m._id} value={m._id}>{m.name} ({m.phone})</option>
                        ))}
                    </select>
                </div>

                {/* Subscription Selection */}
                {selectedMember && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Select Group/Chit</label>
                        <select
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            onChange={e => {
                                const sub = subscriptions.find(s => s._id === e.target.value);
                                setSelectedSub(sub);
                                if (sub) {
                                    // Auto-fill amount due?
                                    // Calculate logic: (Contribution * Units) / Factor
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
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                            <div>
                                <p className="text-slate-500">Total Due</p>
                                <p>₹ {selectedSub.totalDue}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Pending</p>
                                <p>₹ {selectedSub.pendingAmount}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Collection Details */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Period Number</label>
                        <input
                            type="number"
                            name="basePeriodNumber"
                            value={formData.basePeriodNumber}
                            onChange={e => setFormData({ ...formData, basePeriodNumber: e.target.value })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 1"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Date</label>
                        <input
                            type="date"
                            name="periodDate"
                            value={formData.periodDate}
                            onChange={e => setFormData({ ...formData, periodDate: e.target.value })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Amount Paid</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-500">₹</span>
                        <input
                            type="number"
                            name="amountPaid"
                            value={formData.amountPaid}
                            onChange={e => setFormData({ ...formData, amountPaid: e.target.value })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Payment Mode</label>
                    <select
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
                        className="px-6 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
