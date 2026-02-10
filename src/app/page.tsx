'use client';

import DashboardStats from '@/components/DashboardStats';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useDashboard } from '@/lib/swr';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
};

export default function Home() {
    const { data, isLoading } = useDashboard();

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Dashboard</h1>
                    <p className="text-sm text-zinc-400">Welcome back, update your collections today.</p>
                </div>
                <Link href="/groups/new" className="primary-btn px-6 py-2.5 flex items-center justify-center gap-2 w-full md:w-auto text-sm">
                    <Plus size={18} />
                    <span>New Group</span>
                </Link>
            </motion.header>

            <motion.div variants={itemVariants}>
                <DashboardStats data={data} />
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Collections */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-semibold text-white">Recent Collections</h2>
                            <Link href="/collections" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</Link>
                        </div>
                        <div className="space-y-3">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full skeleton" />
                                            <div className="space-y-2">
                                                <div className="w-28 h-3.5 skeleton" />
                                                <div className="w-40 h-3 skeleton" />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-right">
                                            <div className="w-16 h-3.5 skeleton ml-auto" />
                                            <div className="w-20 h-3 skeleton ml-auto" />
                                        </div>
                                    </div>
                                ))
                            ) : data?.recentCollections?.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8 text-sm">No collections yet.</p>
                            ) : (
                                data?.recentCollections?.map((col: any) => (
                                    <div key={col._id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-zinc-800/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                {col.memberId?.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white text-sm">{col.memberId?.name}</p>
                                                <p className="text-xs text-zinc-500">{col.groupId?.groupName} · Period {col.basePeriodNumber}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-white text-sm">₹ {col.amountPaid}</p>
                                            <p className="text-xs text-emerald-400">{col.paymentMode}</p>
                                        </div>
                                    </div>
                                )))}
                        </div>
                    </div>
                </div>

                {/* Pending Dues */}
                <div>
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-5">Top Pending Dues</h2>
                        <div className="space-y-2">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full skeleton" />
                                            <div className="w-24 h-3 skeleton" />
                                        </div>
                                        <div className="w-14 h-3 skeleton" />
                                    </div>
                                ))
                            ) : data?.pendingDuesList?.length === 0 ? (
                                <p className="text-zinc-500 text-center py-6 text-sm">No pending dues!</p>
                            ) : (
                                data?.pendingDuesList?.map((item: any) => (
                                    <Link key={item._id} href={`/members/${item.memberId?._id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span className="text-zinc-300 text-sm">{item.memberId?.name}</span>
                                        </div>
                                        <span className="text-rose-400 font-medium text-sm">₹ {item.pendingAmount}</span>
                                    </Link>
                                )))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
