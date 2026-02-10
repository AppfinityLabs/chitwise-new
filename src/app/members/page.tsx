'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useMembers } from '@/lib/swr';

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.03 } } };
const itemVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

export default function MembersPage() {
    const { user } = useAuth();
    const { data: members, isLoading } = useMembers();
    const router = useRouter();

    const list = Array.isArray(members) ? members : [];

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Members</h1>
                    <p className="text-sm md:text-base text-zinc-400">Directory of all registered participants.</p>
                </div>
                <Link href="/members/new" className="primary-btn px-6 py-2 flex items-center justify-center gap-2 w-full md:w-auto">
                    <Plus size={18} />
                    <span>Add Member</span>
                </Link>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 text-zinc-200 font-medium border-b border-white/5">
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
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b border-white/5">
                                    <td className="p-4"><div className="flex items-center gap-3"><div className="skeleton w-8 h-8 rounded-full" /><div className="skeleton h-4 w-28 rounded" /></div></td>
                                    <td className="p-4"><div className="skeleton h-4 w-24 rounded" /></td>
                                    {user?.role === 'SUPER_ADMIN' && <td className="p-4"><div className="skeleton h-4 w-12 rounded" /></td>}
                                    <td className="p-4"><div className="skeleton h-5 w-16 rounded-full" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-20 rounded" /></td>
                                    <td className="p-4"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
                                </tr>
                            ))
                        ) : list.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No members found. Add one to get started.</td></tr>
                        ) : (
                            list.map((member: any) => (
                                <tr
                                    key={member._id}
                                    onClick={() => router.push(`/members/${member._id}`)}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
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
                                            <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md border border-white/10">
                                                {member.organisationId?.code || '-'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${member.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="p-4">{new Date(member.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-medium">View History</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
