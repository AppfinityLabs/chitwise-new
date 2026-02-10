'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, DollarSign, Users, Trash2, Copy, Edit, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGroups, invalidateAfterGroupMutation } from '@/lib/swr';
import { groupsApi } from '@/lib/api';

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function GroupsPage() {
    const { user } = useAuth();
    const { data: groups, isLoading } = useGroups();
    const [deleting, setDeleting] = useState<string | null>(null);
    const [cloning, setCloning] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async (groupId: string, groupName: string) => {
        if (!confirm(`Are you sure you want to delete "${groupName}"?\n\nThis will permanently delete:\n• The group\n• All members in this group\n• All collections for this group\n\nThis action cannot be undone.`)) {
            return;
        }

        setDeleting(groupId);
        try {
            await groupsApi.delete(groupId);
            await invalidateAfterGroupMutation(groupId);
        } catch (err: any) {
            alert(`Failed to delete group: ${err.message}`);
        } finally {
            setDeleting(null);
        }
    };

    const handleClone = async (groupId: string, groupName: string) => {
        if (!confirm(`Clone "${groupName}"?\n\nThis will create a new group with the same settings but no members or collections.`)) {
            return;
        }

        setCloning(groupId);
        try {
            const data = await groupsApi.clone(groupId);
            await invalidateAfterGroupMutation();
            router.push(`/groups/${data.clonedGroup._id}/edit`);
        } catch (err: any) {
            alert(`Failed to clone group: ${err.message}`);
        } finally {
            setCloning(null);
        }
    };

    const list = Array.isArray(groups) ? groups : [];

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Chit Groups</h1>
                    <p className="text-sm md:text-base text-zinc-400">Manage your chit schemes and tracked periods.</p>
                </div>
                <Link href="/groups/new" className="primary-btn px-6 py-2 flex items-center justify-center gap-2 w-full md:w-auto">
                    <Plus size={18} />
                    <span>Create New Group</span>
                </Link>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="glass-card p-6 space-y-4">
                            <div className="flex gap-2">
                                <div className="skeleton h-6 w-20 rounded-full" />
                                <div className="skeleton h-6 w-16 rounded-full" />
                            </div>
                            <div className="skeleton h-6 w-3/4 rounded" />
                            <div className="skeleton h-4 w-1/2 rounded" />
                            <div className="space-y-2 pt-2">
                                <div className="skeleton h-4 w-full rounded" />
                                <div className="skeleton h-4 w-2/3 rounded" />
                            </div>
                            <div className="pt-4 border-t border-white/5 flex justify-between">
                                <div className="skeleton h-4 w-16 rounded" />
                                <div className="skeleton h-4 w-24 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : list.length === 0 ? (
                <div className="empty-state">
                    <h3 className="text-xl font-bold text-white mb-2">No Groups Found</h3>
                    <p className="text-zinc-400 mb-6">Start by creating your first chit group.</p>
                    <Link href="/groups/new" className="primary-btn px-6 py-2 inline-flex items-center gap-2">
                        <Plus size={18} />
                        <span>Create Group</span>
                    </Link>
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {list.map((group: any) => (
                        <motion.div key={group._id} variants={itemVariants} className="relative group">
                            <div className="glass-card p-6 h-full hover:border-white/10 transition-all duration-300 relative overflow-hidden">
                                {/* Action Buttons */}
                                <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <Link
                                        href={`/groups/${group._id}/edit`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all"
                                        title="Edit group"
                                    >
                                        <Edit size={16} />
                                    </Link>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClone(group._id, group.groupName); }}
                                        disabled={cloning === group._id}
                                        className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all disabled:opacity-50"
                                        title="Clone group"
                                    >
                                        {cloning === group._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(group._id, group.groupName); }}
                                        disabled={deleting === group._id}
                                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all disabled:opacity-50"
                                        title="Delete group"
                                    >
                                        {deleting === group._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>

                                <Link href={`/groups/${group._id}`} className="block relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 rounded-full bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300">
                                                {group.frequency}
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${group.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                                {group.status}
                                            </span>
                                        </div>
                                        {user?.role === 'SUPER_ADMIN' && group.organisationId && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs font-medium text-purple-400" title={group.organisationId.name}>
                                                <Building2 size={12} />
                                                <span className="max-w-[100px] truncate">{group.organisationId.code}</span>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{group.groupName}</h3>
                                    <p className="text-zinc-500 text-sm mb-6">Period {group.currentPeriod} of {group.totalPeriods}</p>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-zinc-300">
                                            <DollarSign size={16} className="text-indigo-400" />
                                            <span className="font-medium">₹ {group.contributionAmount.toLocaleString()}<span className="text-zinc-500 text-xs font-normal"> / unit</span></span>
                                        </div>
                                        <div className="flex items-center gap-3 text-zinc-300">
                                            <Users size={16} className="text-indigo-400" />
                                            <span className="font-medium">{group.totalUnits} <span className="text-zinc-500 text-xs font-normal">Total Units</span></span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-sm">
                                        <span className="text-zinc-500">Pot Value</span>
                                        <span className="text-white font-bold">₹ {(group.totalUnits * group.contributionAmount).toLocaleString()}</span>
                                    </div>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
