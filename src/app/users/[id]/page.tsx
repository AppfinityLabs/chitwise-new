'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, User, Mail, Lock, Shield, Trash2, Building2 } from 'lucide-react';

interface EditUserPageProps {
    params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'ORG_ADMIN',
        status: 'ACTIVE',
        organisationId: ''
    });

    const [organisations, setOrganisations] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/organisations')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setOrganisations(data);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        // Fetch user details
        fetch(`/api/users/${id}`)
            .then(res => {
                if (res.status === 404) {
                    setNotFound(true);
                    throw new Error('User not found');
                }
                if (!res.ok) throw new Error('Failed to fetch user');
                return res.json();
            })
            .then(data => {
                setFormData({
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    status: data.status,
                    organisationId: data.organisationId || '',
                    password: '' // Don't persist password
                });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                if (!notFound) setError(err.message);
                setLoading(false);
            });
    }, [id, notFound]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update user');
            }

            // Success
            router.push('/users');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="text-center p-12">
                <h2 className="text-xl text-white font-bold mb-2">User Not Found</h2>
                <Link href="/users" className="text-indigo-400 hover:text-indigo-300">
                    Return to Users
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <Link href="/users" className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Users
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Edit User</h1>
                        <p className="text-zinc-400 mt-1">Update user account details.</p>
                    </div>
                    {/* Delete button (Double check not super admin) */}
                    {formData.role !== 'SUPER_ADMIN' && (
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
                                    fetch(`/api/users/${id}`, { method: 'DELETE' })
                                        .then(res => {
                                            if (res.ok) {
                                                router.push('/users');
                                                router.refresh();
                                            } else {
                                                alert('Failed to delete user');
                                            }
                                        });
                                }
                            }}
                            className="p-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors"
                            title="Delete User"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-card p-8">
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-300">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User size={18} className="text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-300">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail size={18} className="text-zinc-500" />
                            </div>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-300">New Password (Optional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={18} className="text-zinc-500" />
                            </div>
                            <input
                                type="password"
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Role */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-300">Role</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Shield size={18} className="text-zinc-500" />
                                </div>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                    disabled={formData.role === 'SUPER_ADMIN'}
                                >
                                    <option value="ORG_ADMIN">Organisation Admin</option>
                                    {formData.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                                </select>
                            </div>
                            {formData.role === 'SUPER_ADMIN' && <p className="text-xs text-zinc-500">Super Admin role cannot be changed.</p>}
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-300">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                disabled={formData.role === 'SUPER_ADMIN'}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Organisation (Visible for Org Admin) */}
                    {formData.role === 'ORG_ADMIN' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-300">Organisation</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Building2 size={18} className="text-zinc-500" />
                                </div>
                                <select
                                    required
                                    value={formData.organisationId || ''}
                                    onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select Organisation</option>
                                    {organisations.map(org => (
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

                    {/* Submit */}
                    <div className="pt-4 flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 primary-btn py-3.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
