'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, User } from 'lucide-react';
import { useMember, invalidateAfterMemberCreate } from '@/lib/swr';
import { membersApi } from '@/lib/api';

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: member, isLoading } = useMember(id);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        status: 'ACTIVE',
        kycVerified: false,
    });

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                phone: member.phone || '',
                email: member.email || '',
                address: member.address || '',
                status: member.status || 'ACTIVE',
                kycVerified: member.kycVerified || false,
            });
        }
    }, [member]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await membersApi.update(id, formData);
            await invalidateAfterMemberCreate();
            router.push(`/members/${id}`);
        } catch (err: any) {
            alert(err.message || 'Failed to update member');
        } finally {
            setLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="skeleton h-5 w-32 rounded" />
                <div className="skeleton h-8 w-48 rounded" />
                <div className="glass-card p-8 space-y-6">
                    {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded" />)}
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl text-white font-bold">Member Not Found</h2>
                <Link href="/members" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">Back to Directory</Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link href={`/members/${id}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Member</span>
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <User className="text-indigo-400" size={26} />
                Edit Member
            </h1>

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Full Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Phone Number</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Optional"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Address</label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Optional"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                    <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer py-3">
                            <input
                                type="checkbox"
                                name="kycVerified"
                                checked={formData.kycVerified}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-white/20 bg-zinc-900/50 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-zinc-300">KYC Verified</span>
                        </label>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                    <Link
                        href={`/members/${id}`}
                        className="px-6 py-3 bg-zinc-900/50 text-zinc-400 hover:text-white rounded-xl font-medium border border-white/10 transition-all flex items-center justify-center"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
