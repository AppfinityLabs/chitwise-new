'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, Trophy, Gavel, Sparkles, Calculator,
    Crown, ChevronDown, Coins, Building2, Save
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGroups, useSubscriptions, useOrganisations, invalidateAfterWinnerCreate } from '@/lib/swr';
import { winnersApi } from '@/lib/api';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
}

export default function DeclareWinnerPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { data: organisations } = useOrganisations();
    const { data: allGroups = [], isLoading: groupsLoading } = useGroups();

    const [selectedOrg, setSelectedOrg] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedMember, setSelectedMember] = useState('');
    const [selectionMethod, setSelectionMethod] = useState<'LOTTERY' | 'AUCTION'>('LOTTERY');
    const [bidAmount, setBidAmount] = useState('');
    const [prizeAmount, setPrizeAmount] = useState(0);
    const [winningUnits, setWinningUnits] = useState('1');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Filter groups by selected org (for SUPER_ADMIN) and only ACTIVE
    const groups = allGroups.filter((g: any) => {
        const isActive = g.status === 'ACTIVE';
        if (user?.role === 'SUPER_ADMIN' && selectedOrg) {
            return isActive && (g.organisationId?._id === selectedOrg || g.organisationId === selectedOrg);
        }
        return isActive;
    });

    const { data: members = [], isLoading: membersLoading } = useSubscriptions(
        selectedGroup ? { groupId: selectedGroup } : undefined
    );

    const activeGroup = groups.find((g: any) => g._id === selectedGroup);
    const activeMember = members.find((m: any) => m._id === selectedMember);

    // Reset downstream selections when upstream changes
    useEffect(() => { setSelectedGroup(''); setSelectedMember(''); }, [selectedOrg]);
    useEffect(() => { setSelectedMember(''); setBidAmount(''); }, [selectedGroup]);

    // Recalculate prize
    useEffect(() => {
        if (!activeGroup) return;
        const potValue = activeGroup.contributionAmount * activeGroup.totalUnits;
        const commission = activeGroup.commissionValue;
        const bid = Number(bidAmount) || 0;
        const units = Number(winningUnits) || 1;
        const calculatedPrize = (potValue - commission - bid) * units;
        setPrizeAmount(calculatedPrize > 0 ? calculatedPrize : 0);
    }, [activeGroup, bidAmount, selectionMethod, winningUnits]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedGroup || !selectedMember) {
            setError('Please select group and member');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            const potValue = activeGroup!.contributionAmount * activeGroup!.totalUnits;
            const commission = activeGroup!.commissionValue;
            const bid = Number(bidAmount) || 0;

            await winnersApi.create({
                groupId: selectedGroup,
                groupMemberId: selectedMember,
                memberId: activeMember?.memberId?._id,
                basePeriodNumber: activeGroup!.currentPeriod || 1,
                winningUnits: Number(winningUnits) || 1,
                prizeAmount,
                commissionEarned: commission,
                selectionMethod,
                remarks: remarks || undefined,
            });
            await invalidateAfterWinnerCreate(selectedGroup);
            router.push('/winners');
        } catch (err: any) {
            setError(err.message || 'Failed to declare winner');
            setSubmitting(false);
        }
    }

    const orgList = Array.isArray(organisations) ? organisations : [];

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/winners" className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="text-amber-400" size={26} />
                        Declare Winner
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Record a draw or auction result</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                    <p className="text-rose-200 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
                {/* Organisation Selector (SUPER_ADMIN only) */}
                {user?.role === 'SUPER_ADMIN' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Organisation</label>
                        <div className="relative">
                            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <select
                                value={selectedOrg}
                                onChange={e => setSelectedOrg(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">All Organisations</option>
                                {orgList.map((org: any) => (
                                    <option key={org._id} value={org._id}>{org.name} ({org.code})</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Group Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Chit Group</label>
                    <div className="relative">
                        <Coins size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <select
                            value={selectedGroup}
                            onChange={e => setSelectedGroup(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            required
                        >
                            <option value="">Select Group</option>
                            {groups.map((g: any) => (
                                <option key={g._id} value={g._id}>
                                    {g.groupName} — Period {g.currentPeriod}/{g.totalPeriods}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                </div>

                {/* Pot Info Card */}
                {activeGroup && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 p-6">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Trophy size={64} className="text-amber-500" />
                        </div>
                        <p className="text-amber-500/80 text-xs font-bold uppercase tracking-widest mb-1">Total Pot Value</p>
                        <h2 className="text-3xl font-medium text-amber-400">
                            {formatCurrency(activeGroup.contributionAmount * activeGroup.totalUnits)}
                        </h2>
                        <div className="mt-4 flex gap-6 text-xs text-zinc-400">
                            <span>Period {activeGroup.currentPeriod}/{activeGroup.totalPeriods}</span>
                            <span>Commission: {formatCurrency(activeGroup.commissionValue)}</span>
                            <span>Units: {activeGroup.totalUnits}</span>
                        </div>
                    </div>
                )}

                {/* Member Selector */}
                {selectedGroup && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Winner Member</label>
                        {membersLoading ? (
                            <div className="flex items-center justify-center p-6 text-zinc-500">
                                <Loader2 className="animate-spin mr-2" size={18} />
                                Loading members...
                            </div>
                        ) : members.length === 0 ? (
                            <p className="text-zinc-500 text-sm p-4">No members enrolled in this group.</p>
                        ) : (
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/5 bg-zinc-900/50 divide-y divide-white/5">
                                {members.map((sub: any) => (
                                    <label
                                        key={sub._id}
                                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${selectedMember === sub._id ? 'bg-amber-500/10' : 'hover:bg-white/5'}`}
                                    >
                                        <input
                                            type="radio" name="winner" value={sub._id}
                                            checked={selectedMember === sub._id}
                                            onChange={e => setSelectedMember(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${selectedMember === sub._id
                                            ? 'bg-amber-500 text-black scale-110' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {selectedMember === sub._id ? <Crown size={14} /> : sub.memberId?.name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${selectedMember === sub._id ? 'text-amber-400' : 'text-zinc-200'}`}>
                                                {sub.memberId?.name}
                                            </p>
                                            <p className="text-xs text-zinc-500">{sub.units} unit(s)</p>
                                        </div>
                                        {selectedMember === sub._id && <Sparkles size={16} className="text-amber-500 animate-pulse" />}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Selection Method */}
                {selectedGroup && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Selection Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectionMethod('LOTTERY')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectionMethod === 'LOTTERY'
                                    ? 'bg-white text-zinc-900 border-white shadow-lg' : 'bg-zinc-900/50 text-zinc-500 border-white/10 hover:bg-zinc-800'}`}
                            >
                                <Sparkles size={20} />
                                <span className="text-xs font-bold">Lottery Draw</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectionMethod('AUCTION')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectionMethod === 'AUCTION'
                                    ? 'bg-white text-zinc-900 border-white shadow-lg' : 'bg-zinc-900/50 text-zinc-500 border-white/10 hover:bg-zinc-800'}`}
                            >
                                <Gavel size={20} />
                                <span className="text-xs font-bold">Auction Bid</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Bid Amount (auction only) */}
                {selectionMethod === 'AUCTION' && selectedGroup && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Bid Discount Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">₹</span>
                            <input
                                type="number"
                                value={bidAmount}
                                onChange={e => setBidAmount(e.target.value)}
                                placeholder="Enter bid amount"
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                    </div>
                )}

                {/* Winning Units */}
                {selectedGroup && (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Winning Units</label>
                            <input
                                type="number" min="1"
                                value={winningUnits}
                                onChange={e => setWinningUnits(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Remarks (optional)</label>
                            <input
                                type="text"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder="Any notes..."
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Payout Breakdown */}
                {activeGroup && (
                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                            <Calculator size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">Payout Breakdown</span>
                        </div>
                        <div className="flex justify-between text-sm text-zinc-500">
                            <span>Total Pot</span>
                            <span>{formatCurrency(activeGroup.contributionAmount * activeGroup.totalUnits)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-zinc-500">
                            <span>Commission (−)</span>
                            <span>{formatCurrency(activeGroup.commissionValue)}</span>
                        </div>
                        {selectionMethod === 'AUCTION' && (
                            <div className="flex justify-between text-sm text-rose-400">
                                <span>Bid Discount (−)</span>
                                <span>{formatCurrency(Number(bidAmount) || 0)}</span>
                            </div>
                        )}
                        {Number(winningUnits) > 1 && (
                            <div className="flex justify-between text-sm text-zinc-500">
                                <span>× {winningUnits} units</span>
                                <span />
                            </div>
                        )}
                        <div className="border-t border-white/5 pt-3 mt-1 flex justify-between items-end">
                            <span className="text-sm font-medium text-zinc-300">Net Prize</span>
                            <span className="text-2xl font-bold text-amber-400">{formatCurrency(prizeAmount)}</span>
                        </div>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting || !selectedMember || !selectedGroup}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <Trophy size={18} />
                            Confirm Winner
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
