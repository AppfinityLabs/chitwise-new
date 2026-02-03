'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Calendar, DollarSign, Users, Trash2, Copy, Edit, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ChitGroup {
    _id: string;
    groupName: string;
    frequency: string;
    contributionAmount: number;
    totalUnits: number;
    currentPeriod: number;
    totalPeriods: number;
    status: string;
    organisationId?: {
        name: string;
        code: string;
    };
}

export default function GroupsPage() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<ChitGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [cloning, setCloning] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = () => {
        fetch('/api/chitgroups')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setGroups(data);
                } else {
                    console.error('Expected array of groups, got:', data);
                    setGroups([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleDelete = async (groupId: string, groupName: string) => {
        if (!confirm(`Are you sure you want to delete "${groupName}"?\n\nThis will permanently delete:\n• The group\n• All members in this group\n• All collections for this group\n\nThis action cannot be undone.`)) {
            return;
        }

        setDeleting(groupId);
        try {
            const res = await fetch(`/api/chitgroups/${groupId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Remove from local state
                setGroups(groups.filter(g => g._id !== groupId));
                alert('Group deleted successfully');
            } else {
                const error = await res.json();
                alert(`Failed to delete group: ${error.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting group');
        } finally {
            setDeleting(null);
        }
    };

    const handleClone = async (groupId: string, groupName: string) => {
        if (!confirm(`Clone "${groupName}"?\n\nThis will create a new group with the same settings but no members or collections. You can then edit the new group's configuration.`)) {
            return;
        }

        setCloning(groupId);
        try {
            const res = await fetch(`/api/chitgroups/${groupId}/clone`, {
                method: 'POST',
            });

            if (res.ok) {
                const data = await res.json();
                // Redirect to edit page for the cloned group
                router.push(`/groups/${data.clonedGroup._id}/edit`);
            } else {
                const error = await res.json();
                alert(`Failed to clone group: ${error.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error cloning group');
        } finally {
            setCloning(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Chit Groups</h1>
                    <p className="text-slate-400">Manage your chit schemes and tracked periods.</p>
                </div>
                <Link href="/groups/new" className="primary-btn px-6 py-2 flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create New Group</span>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : groups.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">No Groups Found</h3>
                    <p className="text-slate-400 mb-6">Start by creating your first chit group.</p>
                    <Link href="/groups/new" className="primary-btn px-6 py-2 inline-flex items-center gap-2">
                        <Plus size={18} />
                        <span>Create Group</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div key={group._id} className="relative group">
                            <div className="glass-card p-6 h-full hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all" />

                                {/* Action Buttons */}
                                <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    {/* Edit Button */}
                                    <Link
                                        href={`/groups/${group._id}/edit`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all"
                                        title="Edit group"
                                    >
                                        <Edit size={16} />
                                    </Link>

                                    {/* Clone Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleClone(group._id, group.groupName);
                                        }}
                                        disabled={cloning === group._id}
                                        className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Clone group"
                                    >
                                        {cloning === group._id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Copy size={16} />
                                        )}
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete(group._id, group.groupName);
                                        }}
                                        disabled={deleting === group._id}
                                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete group"
                                    >
                                        {deleting === group._id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>

                                <Link href={`/groups/${group._id}`} className="block relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-xs font-medium text-slate-300">
                                                {group.frequency}
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${group.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
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
                                    <p className="text-slate-400 text-sm mb-6">Period {group.currentPeriod} of {group.totalPeriods}</p>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <DollarSign size={16} className="text-indigo-400" />
                                            <span className="font-medium">₹ {group.contributionAmount.toLocaleString()}<span className="text-slate-500 text-xs font-normal"> / unit</span></span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <Users size={16} className="text-indigo-400" />
                                            <span className="font-medium">{group.totalUnits} <span className="text-slate-500 text-xs font-normal">Total Units</span></span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Pot Value</span>
                                        <span className="text-white font-bold">₹ {(group.totalUnits * group.contributionAmount).toLocaleString()}</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
