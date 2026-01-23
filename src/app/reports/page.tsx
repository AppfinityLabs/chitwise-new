'use client';

import { BarChart, PieChart, Activity } from 'lucide-react';

export default function ReportsPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Reports</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center h-64 border-dashed border-2 border-slate-700 bg-transparent">
                    <BarChart size={48} className="text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">Collection Trends</h3>
                    <p className="text-sm text-slate-500">Coming Soon in Phase 2</p>
                </div>
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center h-64 border-dashed border-2 border-slate-700 bg-transparent">
                    <PieChart size={48} className="text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">Member Distribution</h3>
                    <p className="text-sm text-slate-500">Coming Soon in Phase 2</p>
                </div>
            </div>
        </div>
    );
}
