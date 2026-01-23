'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, ArrowLeft } from 'lucide-react';

export default function AddGroupMemberPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params);

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [group, setGroup] = useState<any>(null);

    const [formData, setFormData] = useState({
        memberId: '',
        units: 1,
        collectionPattern: ''
    });

    useEffect(() => {
        // Fetch group details and members
        Promise.all([
            fetch(`/api/chitgroups/${id}`).then(res => res.json()),
            fetch('/api/members').then(res => res.json())
        ]).then(([groupData, membersData]) => {
            setGroup(groupData);
            setMembers(membersData);
            // Default collection pattern to group frequency
            setFormData(prev => ({ ...prev, collectionPattern: groupData.frequency }));
        });
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/groupmembers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: id,
                    ...formData
                }),
            });

            if (res.ok) {
                router.push(`/groups/${id}`);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to add member to group');
            }
        } catch (err) {
            console.error(err);
            alert('Error adding member');
        } finally {
            setLoading(false);
        }
    };

    if (!group) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <Link href={`/groups/${id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Group</span>
            </Link>

            <h1 className="text-3xl font-bold text-white mb-2">Add Member to Group</h1>
            <p className="text-slate-400 mb-8">Assign a member to <span className="text-white font-medium">{group.groupName}</span></p>

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Select Member</label>
                    <select
                        value={formData.memberId}
                        onChange={e => setFormData({ ...formData, memberId: e.target.value })}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                    >
                        <option value="">-- Choose Member --</option>
                        {members.map(m => (
                            <option key={m._id} value={m._id}>{m.name} ({m.phone})</option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500">Only showing active members.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Number of Units</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={formData.units}
                            onChange={e => setFormData({ ...formData, units: parseFloat(e.target.value) })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Collection Pattern</label>
                        <select
                            value={formData.collectionPattern}
                            onChange={e => setFormData({ ...formData, collectionPattern: e.target.value })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                        <p className="text-xs text-slate-500">How often will they pay?</p>
                    </div>
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
                        <span>Add to Group</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
