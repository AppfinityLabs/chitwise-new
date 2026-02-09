'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    Bell,
    Send,
    Plus,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FileText,
    Clock,
    X,
    Users,
    Building2,
    Globe
} from 'lucide-react';

interface NotificationItem {
    _id: string;
    title: string;
    body: string;
    url?: string;
    targetType: 'ALL' | 'ORGANISATION' | 'USER';
    targetId?: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
    successCount: number;
    failCount: number;
    sentAt?: string;
    createdAt: string;
    createdBy?: { name: string; email: string };
}

interface Organisation {
    _id: string;
    name: string;
    code: string;
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sending, setSending] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [url, setUrl] = useState('');
    const [targetType, setTargetType] = useState<'ALL' | 'ORGANISATION'>('ALL');
    const [targetId, setTargetId] = useState('');
    const [sendNow, setSendNow] = useState(true);

    useEffect(() => {
        if (!authLoading && user && user.role !== 'SUPER_ADMIN') {
            router.push('/');
            return;
        }
        if (!authLoading && user?.role === 'SUPER_ADMIN') {
            fetchNotifications();
            fetchOrganisations();
        }
    }, [user, authLoading, router]);

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchOrganisations() {
        try {
            const res = await fetch('/api/organisations');
            const data = await res.json();
            setOrganisations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch organisations:', err);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;

        setSending(true);
        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    body: body.trim(),
                    url: url.trim() || '/',
                    targetType,
                    targetId: targetType === 'ORGANISATION' ? targetId : undefined,
                    sendNow,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create notification');
            }

            // Reset form
            setTitle('');
            setBody('');
            setUrl('');
            setTargetType('ALL');
            setTargetId('');
            setSendNow(true);
            setShowForm(false);

            // Refresh list
            fetchNotifications();
        } catch (err: any) {
            alert(err.message || 'Failed to send notification');
        } finally {
            setSending(false);
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'SENT':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Sent
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertCircle size={12} /> Failed
                    </span>
                );
            case 'DRAFT':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        <FileText size={12} /> Draft
                    </span>
                );
            case 'SCHEDULED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock size={12} /> Scheduled
                    </span>
                );
            default:
                return null;
        }
    }

    function getTargetIcon(targetType: string) {
        switch (targetType) {
            case 'ALL':
                return <Globe size={14} className="text-indigo-400" />;
            case 'ORGANISATION':
                return <Building2 size={14} className="text-cyan-400" />;
            case 'USER':
                return <Users size={14} className="text-amber-400" />;
            default:
                return null;
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Bell size={20} className="text-white" />
                        </div>
                        Push Notifications
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Send notifications to organisation app users</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium text-sm"
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? 'Cancel' : 'New Notification'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="mb-8 bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Send size={18} className="text-indigo-400" />
                        Create Notification
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                required
                                placeholder="e.g. Monthly Collection Reminder"
                                className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                            />
                            <p className="text-xs text-slate-500 mt-1">{title.length}/100</p>
                        </div>

                        {/* Body */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Message</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                maxLength={500}
                                required
                                rows={3}
                                placeholder="Notification message content..."
                                className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">{body.length}/500</p>
                        </div>

                        {/* URL */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Link URL <span className="text-slate-500">(optional)</span></label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="/ (opens app home)"
                                className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                            />
                        </div>

                        {/* Target */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Send To</label>
                                <select
                                    value={targetType}
                                    onChange={(e) => setTargetType(e.target.value as 'ALL' | 'ORGANISATION')}
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value="ALL">All Organisations</option>
                                    <option value="ORGANISATION">Specific Organisation</option>
                                </select>
                            </div>

                            {targetType === 'ORGANISATION' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Organisation</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="">Select...</option>
                                        {organisations.map((org) => (
                                            <option key={org._id} value={org._id}>
                                                {org.name} ({org.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Send Now Toggle */}
                        <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-white/5">
                            <button
                                type="button"
                                onClick={() => setSendNow(!sendNow)}
                                className={`w-11 h-6 rounded-full relative transition-colors ${sendNow ? 'bg-indigo-600' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-all ${sendNow ? 'right-1' : 'left-1'}`} />
                            </button>
                            <div>
                                <p className="text-sm font-medium text-slate-200">Send immediately</p>
                                <p className="text-xs text-slate-500">{sendNow ? 'Push notification will be sent right away' : 'Save as draft'}</p>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sending || !title.trim() || !body.trim()}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium text-sm"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        {sendNow ? 'Send Now' : 'Save Draft'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="text-center py-20">
                    <div className="h-16 w-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                        <Bell size={28} className="text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-300">No notifications yet</h3>
                    <p className="text-sm text-slate-500 mt-1">Create your first push notification to reach org users</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notif) => (
                        <div
                            key={notif._id}
                            className="bg-slate-900/50 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-white truncate">{notif.title}</h3>
                                        {getStatusBadge(notif.status)}
                                    </div>
                                    <p className="text-sm text-slate-400 line-clamp-2">{notif.body}</p>
                                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            {getTargetIcon(notif.targetType)}
                                            {notif.targetType === 'ALL' ? 'All Orgs' : notif.targetType}
                                        </span>
                                        {notif.status === 'SENT' && (
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 size={12} className="text-emerald-400" />
                                                {notif.successCount} delivered
                                                {notif.failCount > 0 && (
                                                    <span className="text-red-400 ml-1">({notif.failCount} failed)</span>
                                                )}
                                            </span>
                                        )}
                                        <span>
                                            {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        {notif.createdBy && (
                                            <span>by {notif.createdBy.name}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
