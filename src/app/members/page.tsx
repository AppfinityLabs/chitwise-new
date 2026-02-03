'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MembersPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/members')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setMembers(data);
                } else {
                    setMembers([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setMembers([]);
                setLoading(false);
            });
    }, []);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Members</h1>
                    <p className="text-sm md:text-base text-slate-400">Directory of all registered participants.</p>
                </div>
                <Link href="/members/new" className="primary-btn px-6 py-2 flex items-center justify-center gap-2 w-full md:w-auto">
                    <Plus size={18} />
                    <span>Add Member</span>
                </Link>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 text-slate-200 font-medium border-b border-white/5">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Phone</th>
                            {user?.role === 'SUPER_ADMIN' && <th className="p-4">Org</th>}
                            <th className="p-4">Status</th>
                            <th className="p-4">Joined</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No members found. Add one to get started.</td></tr>
                        ) : (
                            members.map((member) => (
                                <tr
                                    key={member._id}
                                    onClick={() => window.location.href = `/members/${member._id}`}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                {member.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-white">{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} />
                                            {member.phone}
                                        </div>
                                    </td>
                                    {user?.role === 'SUPER_ADMIN' && (
                                        <td className="p-4">
                                            <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-white/10">
                                                {member.organisationId?.code || '-'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${member.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="p-4">{new Date(member.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-medium">View History</button>
                                    </td>
                                </tr>
                            )))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
