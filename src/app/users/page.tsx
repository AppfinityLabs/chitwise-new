'use client';

import Link from 'next/link';
import { Plus, UserCog, Mail, Shield, Edit, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUsers, invalidateAfterUserMutation } from '@/lib/swr';
import { usersApi } from '@/lib/api';
import { useState } from 'react';

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { data: users = [], isLoading } = useUsers();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (!authLoading && user && user.role !== 'SUPER_ADMIN') {
        router.push('/');
        return null;
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'ORG_ADMIN':
                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            default:
                return 'bg-zinc-700/50 text-zinc-400 border-zinc-600/20';
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        setDeletingId(userId);
        try {
            await usersApi.delete(userId);
            await invalidateAfterUserMutation();
        } catch {
            alert('Failed to delete user');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <UserCog className="text-indigo-400" size={32} />
                        System Users
                    </h1>
                    <p className="text-zinc-400">Manage administrative access to the platform.</p>
                </div>
                <Link href="/users/new" className="primary-btn px-6 py-2.5 flex items-center gap-2 group">
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Create User</span>
                </Link>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/50 text-zinc-200 font-medium border-b border-white/5">
                            <tr>
                                <th className="p-4 pl-6">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="p-4 pl-6"><div className="flex items-center gap-3"><div className="skeleton w-10 h-10 rounded-full" /><div className="skeleton h-4 w-28 rounded" /></div></td>
                                        <td className="p-4"><div className="skeleton h-4 w-36 rounded" /></td>
                                        <td className="p-4"><div className="skeleton h-6 w-20 rounded-full" /></td>
                                        <td className="p-4"><div className="skeleton h-6 w-16 rounded-full" /></td>
                                        <td className="p-4"><div className="skeleton h-4 w-20 rounded" /></td>
                                        <td className="p-4" />
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-zinc-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Shield className="w-10 h-10 text-zinc-600 mb-2" />
                                            <p>No extra users found.</p>
                                            <p className="text-xs">Create a new user to grant access.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((u: any) => (
                                    <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-bold text-white border border-white/5 shadow-inner">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-white">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-zinc-500" />
                                                {u.email}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(u.role)}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-xs">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {u.role !== 'SUPER_ADMIN' && (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/users/${u._id}`} className="p-2 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors" title="Edit User">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(u._id); }}
                                                        disabled={deletingId === u._id}
                                                        className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete User"
                                                    >
                                                        {deletingId === u._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
