'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Activity, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCardSkeleton() {
    return (
        <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl skeleton" />
                <div className="w-14 h-5 rounded-full skeleton" />
            </div>
            <div className="h-3 w-20 skeleton mb-2.5" />
            <div className="h-7 w-28 skeleton" />
        </div>
    );
}

export default function DashboardStats({ data }: { data: any }) {
    if (!data) return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
    );

    const {
        activeGroups = 0,
        totalCollections = 0,
        activeMembers = 0,
        pendingDues = 0
    } = data?.stats || {};

    const stats = [
        {
            label: 'Active Groups',
            value: activeGroups,
            change: 'Running',
            icon: Layers,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Total Collections',
            value: `₹ ${totalCollections.toLocaleString()}`,
            change: 'Lifetime',
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Active Members',
            value: activeMembers,
            change: 'In Directory',
            icon: Users,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
        },
        {
            label: 'Pending Dues',
            value: `₹ ${pendingDues.toLocaleString()}`,
            change: 'To Collect',
            icon: Activity,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
            isWarning: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="glass-card p-5 relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className={cn("p-2.5 rounded-xl", stat.bg, stat.color)}>
                            <stat.icon size={20} />
                        </div>
                        <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            stat.isWarning ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10"
                        )}>{stat.change}</span>
                    </div>

                    <p className="text-zinc-500 text-xs font-medium mb-0.5">{stat.label}</p>
                    <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                </motion.div>
            ))}
        </div>
    );
}
