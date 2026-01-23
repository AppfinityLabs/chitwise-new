'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Calendar, DollarSign, Users } from 'lucide-react';

interface ChitGroup {
    _id: string;
    groupName: string;
    frequency: string;
    contributionAmount: number;
    totalUnits: number;
    currentPeriod: number;
    totalPeriods: number;
    status: string;
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<ChitGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/chitgroups')
            .then((res) => res.json())
            .then((data) => {
                setGroups(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

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
                        <Link href={`/groups/${group._id}`} key={group._id} className="block group">
                            <div className="glass-card p-6 h-full hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all" />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-xs font-medium text-slate-300">
                                        {group.frequency}
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${group.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {group.status}
                                    </span>
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
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
