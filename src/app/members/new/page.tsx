'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Building2, Layers, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrganisations, invalidateAfterMemberCreate, invalidateAfterSubscriptionCreate } from '@/lib/swr';
import { membersApi, subscriptionsApi, groupsApi } from '@/lib/api';

export default function NewMemberPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const { data: organisations } = useOrganisations();
    const [groups, setGroups] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        status: 'ACTIVE',
        organisationId: ''
    });

    const [enrollData, setEnrollData] = useState({
        groupId: '',
        units: 1,
        collectionPattern: 'MONTHLY',
        joinDate: new Date().toISOString().split('T')[0]
    });

    const orgList = Array.isArray(organisations) ? organisations : [];

    // Fetch Groups when Org changes (or for Org Admin)
    useEffect(() => {
        const fetchGroups = async () => {
            let params: { organisationId?: string } | undefined;
            if (user?.role === 'SUPER_ADMIN') {
                if (!formData.organisationId) { setGroups([]); return; }
                params = { organisationId: formData.organisationId };
            }

            try {
                const data = await groupsApi.list(params);
                if (Array.isArray(data)) {
                    setGroups(data);
                    if (data.length === 1) {
                        setEnrollData(prev => ({ ...prev, groupId: data[0]._id, collectionPattern: data[0].frequency }));
                    } else if (data.length > 1) {
                        setEnrollData(prev => ({ ...prev, groupId: '' }));
                    }
                } else setGroups([]);
            } catch (err) {
                console.error("Failed to fetch groups", err);
            }
        };

        if (user) fetchGroups();
    }, [user, formData.organisationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!enrollData.groupId) { alert('Please select a Chit Group to enroll into.'); return; }

        setLoading(true);
        try {
            const member = await membersApi.create(formData);
            await subscriptionsApi.create({
                memberId: member._id,
                groupId: enrollData.groupId,
                units: Number(enrollData.units),
                collectionPattern: enrollData.collectionPattern,
                joinDate: enrollData.joinDate
            });
            await Promise.all([invalidateAfterMemberCreate(), invalidateAfterSubscriptionCreate(enrollData.groupId)]);
            router.push('/members');
        } catch (err: any) {
            alert(err.message || 'Failed to create member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Add Member</h1>

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">

                {user?.role === 'SUPER_ADMIN' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Organisation</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Building2 size={18} className="text-zinc-500" />
                            </div>
                            <select
                                name="organisationId"
                                value={formData.organisationId}
                                onChange={e => {
                                    setFormData({ ...formData, organisationId: e.target.value });
                                    setEnrollData(prev => ({ ...prev, groupId: '' }));
                                }}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select Organisation</option>
                                {orgList.map((org: any) => (
                                    <option key={org._id} value={org._id}>{org.name} ({org.code})</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Full Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Phone Number</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 9876543210"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Email Address (Optional)</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="john@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Address (Optional)</label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                        placeholder="Residential Address..."
                    />
                </div>

                <div className="pt-4 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Layers size={20} className="text-indigo-400" />
                        Enroll in Group
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Select Chit Group</label>
                            <select
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                value={enrollData.groupId}
                                onChange={e => {
                                    const gId = e.target.value;
                                    const group = groups.find(g => g._id === gId);
                                    setEnrollData({ ...enrollData, groupId: gId, collectionPattern: group ? group.frequency : 'MONTHLY' });
                                }}
                                required
                            >
                                <option value="">-- Select One --</option>
                                {groups.map(g => (
                                    <option key={g._id} value={g._id}>
                                        {g.groupName} ({g.frequency} - ₹{g.contributionAmount}/unit)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Number of Units</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={enrollData.units}
                                    onChange={e => setEnrollData({ ...enrollData, units: Number(e.target.value) })}
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Start Date</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                                    <input
                                        type="date"
                                        value={enrollData.joinDate}
                                        onChange={e => setEnrollData({ ...enrollData, joinDate: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
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
                        <span>Save & Enroll</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
