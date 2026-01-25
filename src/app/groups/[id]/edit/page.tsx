'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        groupName: '',
        frequency: 'WEEKLY',
        contributionAmount: '',
        totalUnits: '',
        totalPeriods: '',
        commissionValue: '',
        allowCustomCollectionPattern: false,
        startDate: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        // Fetch existing group data
        fetch(`/api/chitgroups/${id}`)
            .then(res => res.json())
            .then(data => {
                setFormData({
                    groupName: data.groupName,
                    frequency: data.frequency,
                    contributionAmount: data.contributionAmount.toString(),
                    totalUnits: data.totalUnits.toString(),
                    totalPeriods: data.totalPeriods.toString(),
                    commissionValue: data.commissionValue.toString(),
                    allowCustomCollectionPattern: data.allowCustomCollectionPattern || false,
                    startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
                    status: data.status
                });
                setFetching(false);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load group data');
                setFetching(false);
            });
    }, [id]);

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
            const res = await fetch(`/api/chitgroups/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert('Group updated successfully');
                router.push(`/groups/${id}`);
            } else {
                const error = await res.json();
                alert(`Failed to update group: ${error.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error updating group');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link href={`/groups/${id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Group</span>
            </Link>

            <h1 className="text-3xl font-bold text-white mb-8">Edit Group</h1>

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
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

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="CLOSED">Closed</option>
                    </select>
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
                        <span>Save Changes</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
