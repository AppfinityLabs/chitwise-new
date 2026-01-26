'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, UserCog, Mail, Shield, Edit, Trash2 } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user && user.role !== 'SUPER_ADMIN') {
            router.push('/');
            return;
        }

        if (!authLoading && user?.role === 'SUPER_ADMIN') {
            fetch('/api/users')
                .then((res) => res.json())
                .then((data) => {
                    // Ensure data is an array before setting state
                    if (Array.isArray(data)) {
                        setUsers(data);
                    } else {
                        console.error('API returned non-array:', data);
                        setUsers([]);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch users:', err);
                    setUsers([]);
                    setLoading(false);
                });
        }
    }, [user, authLoading, router]);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'ORG_ADMIN':
                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            default:
                return 'bg-slate-700/50 text-slate-400 border-slate-600/20';
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <UserCog className="text-indigo-400" size={32} />
                        System Users
                    </h1>
                    <p className="text-slate-400">Manage administrative access to the platform.</p>
                </div>
                <Link href="/users/new" className="primary-btn px-6 py-2.5 flex items-center gap-2 group">
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Create User</span>
                </Link>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-slate-200 font-medium border-b border-white/5">
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
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <Loader2 className="animate-spin inline w-8 h-8 text-indigo-500" />
                                        <p className="mt-2 text-slate-500">Loading users...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Shield className="w-10 h-10 text-slate-600 mb-2" />
                                            <p>No extra users found.</p>
                                            <p className="text-xs">Create a new user to grant access.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user._id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-white border border-white/5 shadow-inner">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-white">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-slate-500" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-xs">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {user.role !== 'SUPER_ADMIN' && (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/users/${user._id}`}
                                                        className="p-2 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Are you sure you want to delete this user?')) {
                                                                // Call delete API
                                                                fetch(`/api/users/${user._id}`, { method: 'DELETE' })
                                                                    .then(res => {
                                                                        if (res.ok) {
                                                                            setUsers(users.filter(u => u._id !== user._id));
                                                                        } else {
                                                                            alert('Failed to delete user');
                                                                        }
                                                                    });
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
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
