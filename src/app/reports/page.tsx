'use client';

import { useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Download, TrendingUp, Users, CreditCard, Activity, AlertTriangle, Filter, X, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import { useReports } from '@/lib/swr';
import { reportsApi, type ReportFilters } from '@/lib/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const PAYMENT_MODES = ['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'];

export default function ReportsPage() {
    const [filters, setFilters] = useState<ReportFilters>({});
    const [exportOpen, setExportOpen] = useState(false);
    const { data, isLoading } = useReports(filters);

    const updateFilter = (key: keyof ReportFilters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    };

    const clearFilters = () => setFilters({});
    const hasFilters = !!(filters.startDate || filters.endDate || filters.groupId || filters.paymentMode);

    const triggerExport = (format: 'csv' | 'excel' | 'pdf') => {
        setExportOpen(false);
        const url = reportsApi.exportUrl(format, filters);
        const link = document.createElement('a');
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading && !data) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2"><div className="skeleton h-8 w-60 rounded" /><div className="skeleton h-4 w-44 rounded" /></div>
                    <div className="skeleton h-10 w-32 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="glass-card p-6 space-y-3"><div className="skeleton h-4 w-28 rounded" /><div className="skeleton h-7 w-20 rounded" /></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-card p-6"><div className="skeleton h-80 w-full rounded" /></div>
                    <div className="glass-card p-6"><div className="skeleton h-60 w-full rounded" /></div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const summary = data.summary;
    const topMode = [...(data.paymentModeStats || [])].sort((a, b) => b.value - a.value)[0]?.name || 'N/A';
    const inputClass = 'bg-zinc-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
                    <p className="text-zinc-400 mt-1">Real-time insights into your fund performance</p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setExportOpen((o) => !o)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                    >
                        <Download size={16} />
                        <span>Export</span>
                        <ChevronDown size={14} />
                    </button>
                    {exportOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                            <div className="absolute right-0 mt-2 w-44 glass-card p-1 z-20">
                                <button onClick={() => triggerExport('csv')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors">
                                    <FileText size={15} className="text-emerald-400" /> CSV
                                </button>
                                <button onClick={() => triggerExport('excel')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors">
                                    <FileSpreadsheet size={15} className="text-green-400" /> Excel (.xlsx)
                                </button>
                                <button onClick={() => triggerExport('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors">
                                    <FileText size={15} className="text-rose-400" /> PDF
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card p-4 flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                    <Filter size={16} /> Filters
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">From</label>
                    <input type="date" value={filters.startDate || ''} onChange={(e) => updateFilter('startDate', e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">To</label>
                    <input type="date" value={filters.endDate || ''} onChange={(e) => updateFilter('endDate', e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">Group</label>
                    <select value={filters.groupId || ''} onChange={(e) => updateFilter('groupId', e.target.value)} className={inputClass}>
                        <option value="">All Groups</option>
                        {data.groups?.map((g) => <option key={g._id} value={g._id}>{g.groupName}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">Payment Mode</label>
                    <select value={filters.paymentMode || ''} onChange={(e) => updateFilter('paymentMode', e.target.value)} className={inputClass}>
                        <option value="">All Modes</option>
                        {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                {hasFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-l-4 border-indigo-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Total Collection</p>
                            <h3 className="text-2xl font-bold text-white mt-1">₹ {summary.totalCollected.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Active Members</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{summary.activeMembers}</h3>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Users size={20} />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Active Groups</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{summary.activeGroups}</h3>
                        </div>
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                            <Activity size={20} />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-rose-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Outstanding</p>
                            <h3 className="text-2xl font-bold text-white mt-1">₹ {summary.totalOutstanding.toLocaleString()}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{summary.defaulterCount} defaulters · Top mode: {topMode}</p>
                        </div>
                        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                            <CreditCard size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Charts Area (Bento Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Collection Trends (Large Area) */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-400" />
                        Collection Trends
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trends}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any) => [`₹ ${value.toLocaleString()}`, 'Collected']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Payment Modes (Donut Chart) */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <CreditCard size={18} className="text-emerald-400" />
                        Payment Modes
                    </h3>
                    <div className="h-60 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.paymentModeStats}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.paymentModeStats.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-sm text-zinc-500 font-medium">Modes</span>
                        </div>
                    </div>
                </div>

                {/* 3. Member Distribution (Pie Chart) */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Users size={18} className="text-amber-400" />
                        Member Allocation
                    </h3>
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.distribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    {data.distribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Recent Transactions (Table) */}
                <div className="lg:col-span-2 glass-card p-6 overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Last 10</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-400">
                            <thead className="bg-zinc-900/50 text-zinc-300 font-medium">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Member</th>
                                    <th className="p-3">Group</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 text-center">Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.recentTransactions?.map((tx: any, i: number) => (
                                    <tr key={tx._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-3">{new Date(tx.periodDate).toLocaleDateString()}</td>
                                        <td className="p-3 font-medium text-white">{tx.memberId?.name}</td>
                                        <td className="p-3">{tx.groupId?.groupName}</td>
                                        <td className="p-3 text-right font-bold text-emerald-400">₹ {tx.amountPaid.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${tx.paymentMode === 'CASH' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.paymentMode === 'UPI' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-700 text-zinc-300'
                                                }`}>
                                                {tx.paymentMode}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Defaulter Report */}
            <div className="glass-card p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-400" />
                        Defaulters / Overdue Members
                    </h3>
                    <span className="text-xs text-rose-300 bg-rose-500/10 px-2 py-1 rounded">{data.defaulters?.length || 0} members</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/50 text-zinc-300 font-medium">
                            <tr>
                                <th className="p-3">Member</th>
                                <th className="p-3">Phone</th>
                                <th className="p-3">Group</th>
                                <th className="p-3 text-right">Total Due</th>
                                <th className="p-3 text-right">Collected</th>
                                <th className="p-3 text-right">Pending</th>
                                <th className="p-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.defaulters?.length === 0 && (
                                <tr><td colSpan={7} className="p-6 text-center text-zinc-500">No outstanding dues 🎉</td></tr>
                            )}
                            {data.defaulters?.map((d: any) => (
                                <tr key={d._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-medium text-white">{d.memberName}</td>
                                    <td className="p-3">{d.memberPhone || '—'}</td>
                                    <td className="p-3">{d.groupName}</td>
                                    <td className="p-3 text-right">₹ {d.totalDue.toLocaleString()}</td>
                                    <td className="p-3 text-right text-emerald-400">₹ {d.totalCollected.toLocaleString()}</td>
                                    <td className="p-3 text-right font-bold text-rose-400">₹ {d.pendingAmount.toLocaleString()}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${d.status === 'DEFAULTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {d.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
