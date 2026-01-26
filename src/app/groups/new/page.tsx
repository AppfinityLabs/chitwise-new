'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function NewGroupPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        groupName: '',
        frequency: 'WEEKLY',
        contributionAmount: '',
        totalUnits: '',
        totalPeriods: '',
        commissionValue: '',
        allowCustomCollectionPattern: false,
        startDate: '',
        status: 'ACTIVE',
        organisationId: ''
    });

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            fetch('/api/organisations')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setOrganisations(data);
                })
                .catch(console.error);
        }
    }, [user]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/chitgroups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push('/groups');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create group');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Create New Group</h1>

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">

                {/* Organisation Selection for Super Admin */}
                {user?.role === 'SUPER_ADMIN' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Organisation</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Building2 size={18} className="text-slate-500" />
                            </div>
                            <select
                                name="organisationId"
                                value={formData.organisationId}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Select Organisation</option>
                                {organisations.map(org => (
                                    <option key={org._id} value={org._id}>{org.name} ({org.code})</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Group Name</label>
                    <input
                        name="groupName"
                        value={formData.groupName}
                        onChange={handleChange}
                        placeholder="e.g. 52W-2000-2026"
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Frequency</label>
                        <select
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Start Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Contribution Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-500">₹</span>
                            <input
                                type="number"
                                name="contributionAmount"
                                value={formData.contributionAmount}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="2000"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Total Units</label>
                        <input
                            type="number"
                            name="totalUnits"
                            value={formData.totalUnits}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="52"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Total Periods</label>
                        <input
                            type="number"
                            name="totalPeriods"
                            value={formData.totalPeriods}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="52"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Commission Per Period</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-500">₹</span>
                            <input
                                type="number"
                                name="commissionValue"
                                value={formData.commissionValue}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="4000"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/30 border border-white/5">
                    <input
                        type="checkbox"
                        name="allowCustomCollectionPattern"
                        checked={formData.allowCustomCollectionPattern}
                        onChange={handleChange}
                        id="allowCustom"
                        className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                    />
                    <label htmlFor="allowCustom" className="text-sm text-slate-300">
                        Allow Partial/Custom Collection Patterns (e.g. Daily payments in a Monthly group)
                    </label>
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
                        <span>Create Group</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
