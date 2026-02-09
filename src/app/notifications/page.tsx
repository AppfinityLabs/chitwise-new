'use client';

import { useState, useEffect } from 'react';
import { Bell, Send, Plus, Trash2, RefreshCw, Users, Building2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface Notification {
    _id: string;
    title: string;
    body: string;
    url: string;
    targetType: 'ALL' | 'ORGANISATION' | 'USER';
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
    successCount: number;
    failCount: number;
    sentAt?: string;
    createdAt: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sending, setSending] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        url: '/',
        targetType: 'ALL'
    });

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent, sendNow: boolean) => {
        e.preventDefault();
        setSending(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({ ...formData, sendNow })
            });

            if (res.ok) {
                setFormData({ title: '', body: '', url: '/', targetType: 'ALL' });
                setShowForm(false);
                fetchNotifications();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create notification');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create notification');
        } finally {
            setSending(false);
        }
    };

    const getTargetIcon = (type: string) => {
        switch (type) {
            case 'ALL': return <Globe className="w-4 h-4" />;
            case 'ORGANISATION': return <Building2 className="w-4 h-4" />;
            case 'USER': return <Users className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT': return 'bg-emerald-500/20 text-emerald-400';
            case 'DRAFT': return 'bg-slate-500/20 text-slate-400';
            case 'FAILED': return 'bg-rose-500/20 text-rose-400';
            case 'SCHEDULED': return 'bg-amber-500/20 text-amber-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                            <Bell className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Notifications</h1>
                            <p className="text-slate-400 text-sm">Send push notifications to PWA users</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchNotifications}
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus className="w-5 h-5" />
                            New Notification
                        </button>
                    </div>
                </div>

                {/* Create Form */}
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/50 rounded-2xl border border-white/10 p-6 mb-6"
                    >
                        <h2 className="text-lg font-semibold text-white mb-4">Create Notification</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Notification title..."
                                    maxLength={100}
                                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Message</label>
                                <textarea
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    placeholder="Notification message..."
                                    maxLength={500}
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">URL (on click)</label>
                                    <input
                                        type="text"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="/"
                                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Target Audience</label>
                                    <select
                                        value={formData.targetType}
                                        onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="ALL">All Users</option>
                                        <option value="ORGANISATION">Specific Organisation</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={sending || !formData.title || !formData.body}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    {sending ? 'Sending...' : 'Send Now'}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, false)}
                                    disabled={sending || !formData.title || !formData.body}
                                    className="px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* Notifications List */}
                <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="text-white font-semibold">Recent Notifications</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No notifications yet</p>
                            <p className="text-slate-500 text-sm">Create your first notification to send to users</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((notif) => (
                                <div key={notif._id} className="p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-medium text-white truncate">{notif.title}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notif.status)}`}>
                                                    {notif.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-2">{notif.body}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    {getTargetIcon(notif.targetType)}
                                                    {notif.targetType === 'ALL' ? 'All Users' : notif.targetType}
                                                </span>
                                                {notif.status === 'SENT' && (
                                                    <span className="text-emerald-400">
                                                        ✓ {notif.successCount} sent
                                                        {notif.failCount > 0 && <span className="text-rose-400 ml-1">× {notif.failCount} failed</span>}
                                                    </span>
                                                )}
                                                <span>
                                                    {new Date(notif.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
