'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Activity, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

// Skeleton Component
function StatCardSkeleton() {
    return (
        <div className="glass-card p-6 relative overflow-hidden animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800" />
                <div className="w-16 h-6 rounded-full bg-slate-800" />
            </div>
            <div className="h-4 w-24 bg-slate-800 mb-2 rounded" />
            <div className="h-8 w-32 bg-slate-800 rounded" />
        </div>
    );
}

export default function DashboardStats({ data }: { data: any }) {
    if (!data) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
    );

    const stats = [
        {
            label: 'Total Active Groups',
            value: data.stats.activeGroups,
            change: 'Running Now',
            icon: Layers,
            color: 'from-blue-500 to-cyan-500',
        },
        {
            label: 'Total Collections',
            value: `₹ ${data.stats.totalCollections.toLocaleString()}`,
            change: 'Lifetime',
            icon: DollarSign,
            color: 'from-emerald-500 to-green-500',
        },
        {
            label: 'Active Members',
            value: data.stats.activeMembers,
            change: 'In Directory',
            icon: Users,
            color: 'from-violet-500 to-purple-500',
        },
        {
            label: 'Pending Dues',
            value: `₹ ${data.stats.pendingDues.toLocaleString()}`,
            change: 'To Collect',
            icon: Activity,
            color: 'from-rose-500 to-red-500',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
                >
                    <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity group-hover:opacity-20", stat.color)} />

                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-3 rounded-xl bg-gradient-to-br opacity-80 text-white shadow-lg", stat.color)}>
                            <stat.icon size={24} />
                        </div>
                        {stat.label.includes('Pending') ? (
                            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">{stat.change}</span>
                        ) : (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">{stat.change}</span>
                        )}
                    </div>

                    <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
                    <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                </motion.div>
            ))}
        </div>
    );
}
