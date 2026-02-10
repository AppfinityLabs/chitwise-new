'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Calendar, User, Coins, FileText, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { winnersApi } from '@/lib/api';
import { invalidateAfterWinnerCreate } from '@/lib/swr';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
}

export default function WinnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [markingPaid, setMarkingPaid] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { data: winner, isLoading, error, mutate } = useSWR(
        id ? `/winners/${id}` : null,
        () => winnersApi.get(id)
    );

    const handleMarkPaid = async () => {
        if (!confirm('Mark this winner as PAID? This action cannot be undone.')) return;
        setMarkingPaid(true);
        try {
            await winnersApi.update(id, { status: 'PAID', payoutDate: new Date() });
            await mutate();
            await invalidateAfterWinnerCreate(winner?.groupId?._id);
        } catch (err: any) {
            alert(err.message || 'Failed to update');
        } finally {
            setMarkingPaid(false);
        }
    };

    const handleForfeit = async () => {
        if (!confirm('Mark this winner as FORFEITED?')) return;
        setMarkingPaid(true);
        try {
            await winnersApi.update(id, { status: 'FORFEITED' });
            await mutate();
            await invalidateAfterWinnerCreate(winner?.groupId?._id);
        } catch (err: any) {
            alert(err.message || 'Failed to update');
        } finally {
            setMarkingPaid(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this winner record?')) return;
        setDeleting(true);
        try {
            await winnersApi.delete(id);
            await invalidateAfterWinnerCreate(winner?.groupId?._id);
            router.push('/winners');
        } catch (err: any) {
            alert(err.message || 'Failed to delete');
            setDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="skeleton h-5 w-32 rounded" />
                <div className="glass-card p-8 space-y-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <div className="skeleton h-4 w-24 rounded" />
                            <div className="skeleton h-4 w-32 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !winner) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl text-white font-bold">Winner Not Found</h2>
                <Link href="/winners" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">Back to Winners</Link>
            </div>
        );
    }

    const statusColor = winner.status === 'PAID'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : winner.status === 'FORFEITED'
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/winners" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={16} />
                <span>Back to Winners</span>
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 mb-2">
                        <Trophy className="text-amber-400" size={26} />
                        Winner Detail
                    </h1>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                        {winner.status}
                    </span>
                </div>
                <div className="text-right">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Prize Amount</p>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(winner.prizeAmount)}</p>
                </div>
            </div>

            {/* Detail Card */}
            <div className="glass-card p-8 space-y-5 mb-6">
                <DetailRow icon={<User size={16} />} label="Member" value={winner.memberId?.name || '—'} />
                <DetailRow icon={<Coins size={16} />} label="Group" value={winner.groupId?.groupName || '—'} />
                <DetailRow icon={<Trophy size={16} />} label="Period" value={`#${winner.basePeriodNumber}`} />
                <DetailRow icon={<Trophy size={16} />} label="Winning Units" value={String(winner.winningUnits)} />
                <DetailRow
                    icon={<Trophy size={16} />}
                    label="Selection Method"
                    value={
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${winner.selectionMethod === 'AUCTION'
                            ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {winner.selectionMethod}
                        </span>
                    }
                />
                <DetailRow
                    icon={<Coins size={16} />}
                    label="Commission Earned"
                    value={formatCurrency(winner.commissionEarned)}
                />
                <DetailRow
                    icon={<Calendar size={16} />}
                    label="Payout Date"
                    value={winner.payoutDate ? new Date(winner.payoutDate).toLocaleDateString() : 'Not yet paid'}
                />
                <DetailRow
                    icon={<Calendar size={16} />}
                    label="Declared On"
                    value={new Date(winner.createdAt).toLocaleDateString()}
                />
                {winner.remarks && (
                    <DetailRow icon={<FileText size={16} />} label="Remarks" value={winner.remarks} />
                )}
                {winner.groupId?.organisationId && (
                    <DetailRow
                        icon={<Coins size={16} />}
                        label="Organisation"
                        value={`${winner.groupId.organisationId.name || ''} (${winner.groupId.organisationId.code || ''})`}
                    />
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                {winner.status === 'PENDING' && (
                    <>
                        <button
                            onClick={handleMarkPaid}
                            disabled={markingPaid}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {markingPaid ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            Mark as Paid
                        </button>
                        <button
                            onClick={handleForfeit}
                            disabled={markingPaid}
                            className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-rose-500/20 transition-all disabled:opacity-50"
                        >
                            Forfeit
                        </button>
                    </>
                )}
                {winner.status !== 'PAID' && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded-xl font-medium flex items-center justify-center gap-2 border border-white/10 transition-all disabled:opacity-50"
                    >
                        {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3 text-zinc-500">
                {icon}
                <span className="text-sm">{label}</span>
            </div>
            <div className="text-sm font-medium text-white">{value}</div>
        </div>
    );
}
