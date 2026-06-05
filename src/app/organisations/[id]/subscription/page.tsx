'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle, XCircle, CreditCard, Gift } from 'lucide-react';

interface Subscription {
    _id: string;
    organisationId: string;
    planName: string | null;
    pricePerGroup: number;
    maxGroups: number | null;
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    trialStartDate: string;
    trialEndDate: string;
    startDate: string | null;
}

interface Invoice {
    _id: string;
    billingMonth: string;
    activeGroupCount: number;
    pricePerGroup: number;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
    dueDate: string;
    paidAt: string | null;
}

interface Plan {
    _id: string;
    name: string;
    pricePerGroup: number;
    maxGroups: number | null;
}

export default function SubscriptionManagement() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchData();
    }, [orgId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, invoicesRes, plansRes] = await Promise.all([
                fetch(`/api/org-subscription/status?organisationId=${orgId}`),
                fetch(`/api/org-subscription/invoices?organisationId=${orgId}`),
                fetch(`/api/org-subscription/plans`),
            ]);

            if (subRes.ok) {
                const subData = await subRes.json();
                setSubscription(subData.subscription || subData);
            }
            if (invoicesRes.ok) {
                const invData = await invoicesRes.json();
                setInvoices(Array.isArray(invData) ? invData : invData.invoices || []);
            }
            if (plansRes.ok) {
                const planData = await plansRes.json();
                setPlans(Array.isArray(planData) ? planData : planData.plans || []);
            }
        } catch (error) {
            console.error('Failed to fetch subscription data:', error);
        } finally {
            setLoading(false);
        }
    };

    const performAction = async (action: string, extra: Record<string, any> = {}) => {
        setActionLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/org-subscription/admin-activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organisationId: orgId,
                    action,
                    paymentNote: paymentNote || undefined,
                    ...extra,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' });
                setPaymentNote('');
                fetchData(); // Refresh
            } else {
                setMessage({ text: data.error || 'Action failed', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Network error', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivatePlan = () => {
        if (!selectedPlan) return;
        performAction('activate-plan', { planName: selectedPlan });
    };

    const handleWaiveInvoice = (invoiceId: string) => {
        if (!confirm('Waive this invoice? The org will not need to pay.')) return;
        performAction('waive-invoice', { invoiceId });
    };

    const handleMarkPaid = (invoiceId: string) => {
        if (!confirm('Mark this invoice as paid (cash/manual payment)?')) return;
        performAction('mark-paid', { invoiceId });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/organisations/${orgId}`}
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors mb-6"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Organisation</span>
                </Link>

                <h1 className="text-3xl font-bold text-white">Subscription Management</h1>
                <p className="text-zinc-400 mt-1">Manage plan activation and invoices for this organisation</p>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Current Subscription */}
            <div className="glass-card p-6 mb-6">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                    Current Subscription
                </h2>

                {subscription ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 block">Status</label>
                            <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-1 ${subscription.status === 'ACTIVE' ? 'text-emerald-400' :
                                subscription.status === 'TRIAL' ? 'text-amber-400' :
                                    'text-rose-400'
                                }`}>
                                {subscription.status === 'ACTIVE' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {subscription.status}
                            </span>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block">Plan</label>
                            <p className="text-white mt-1">{subscription.planName || 'None'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block">Price/Group</label>
                            <p className="text-white mt-1">₹{subscription.pricePerGroup}</p>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block">Max Groups</label>
                            <p className="text-white mt-1">{subscription.maxGroups || 'Unlimited'}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-zinc-500">No subscription record found</p>
                )}
            </div>

            {/* Activate Plan */}
            <div className="glass-card p-6 mb-6">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                    Activate Plan (Manual)
                </h2>
                <p className="text-zinc-500 text-sm mb-4">
                    Use this when you receive cash payment or want to activate a plan without online payment.
                </p>

                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Select Plan</label>
                        <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Choose plan...</option>
                            {plans.map((plan) => (
                                <option key={plan._id} value={plan.name}>
                                    {plan.name} — ₹{plan.pricePerGroup}/group
                                    {plan.maxGroups ? ` (max ${plan.maxGroups})` : ' (unlimited)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Payment Note (optional)</label>
                        <input
                            type="text"
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                            placeholder="e.g. Cash received on 5th June"
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        />
                    </div>

                    <button
                        onClick={handleActivatePlan}
                        disabled={!selectedPlan || actionLoading}
                        className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {actionLoading ? 'Processing...' : 'Activate Plan'}
                    </button>
                </div>
            </div>

            {/* Invoices */}
            <div className="glass-card p-6">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                    Invoices
                </h2>

                {invoices.length === 0 ? (
                    <p className="text-zinc-500">No invoices yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-zinc-500 border-b border-zinc-800">
                                    <th className="text-left py-3 px-2">Billing Month</th>
                                    <th className="text-left py-3 px-2">Groups</th>
                                    <th className="text-left py-3 px-2">Amount</th>
                                    <th className="text-left py-3 px-2">Status</th>
                                    <th className="text-left py-3 px-2">Due Date</th>
                                    <th className="text-left py-3 px-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv._id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-3 px-2 text-white">
                                            {new Date(inv.billingMonth).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-2 text-white">{inv.activeGroupCount}</td>
                                        <td className="py-3 px-2 text-white">₹{inv.totalAmount}</td>
                                        <td className="py-3 px-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${inv.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                                                inv.status === 'WAIVED' ? 'bg-blue-500/20 text-blue-400' :
                                                    inv.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-zinc-400">
                                            {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="py-3 px-2">
                                            {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleMarkPaid(inv._id)}
                                                        disabled={actionLoading}
                                                        className="text-xs px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                                        title="Mark as Paid (Cash)"
                                                    >
                                                        <CreditCard size={12} className="inline mr-1" />
                                                        Paid
                                                    </button>
                                                    <button
                                                        onClick={() => handleWaiveInvoice(inv._id)}
                                                        disabled={actionLoading}
                                                        className="text-xs px-3 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                                        title="Waive Invoice"
                                                    >
                                                        <Gift size={12} className="inline mr-1" />
                                                        Waive
                                                    </button>
                                                </div>
                                            )}
                                            {inv.status === 'PAID' && (
                                                <span className="text-xs text-zinc-500">
                                                    {inv.paidAt ? `Paid ${new Date(inv.paidAt).toLocaleDateString('en-IN')}` : 'Paid'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
