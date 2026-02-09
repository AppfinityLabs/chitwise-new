'use client';

import { useEffect, useState, useRef } from 'react';
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
    Globe,
    Image as ImageIcon,
    Upload,
    Trash2,
    Copy,
    RefreshCw,
    Zap,
    BookTemplate,
    Save,
    ChevronDown,
    Calendar,
    AlertTriangle,
} from 'lucide-react';

interface NotificationItem {
    _id: string;
    title: string;
    body: string;
    url?: string;
    image?: string;
    priority: 'normal' | 'urgent';
    targetType: 'ALL' | 'ORGANISATION' | 'USER';
    targetId?: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
    scheduledAt?: string;
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

interface Template {
    _id: string;
    name: string;
    title: string;
    body: string;
    image?: string;
    url?: string;
    priority: 'normal' | 'urgent';
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sending, setSending] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [url, setUrl] = useState('');
    const [image, setImage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [targetType, setTargetType] = useState<'ALL' | 'ORGANISATION'>('ALL');
    const [targetId, setTargetId] = useState('');
    const [sendNow, setSendNow] = useState(true);
    const [scheduledAt, setScheduledAt] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Template save modal
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

    useEffect(() => {
        if (!authLoading && user && user.role !== 'SUPER_ADMIN') {
            router.push('/');
            return;
        }
        if (!authLoading && user?.role === 'SUPER_ADMIN') {
            fetchNotifications();
            fetchOrganisations();
            fetchTemplates();
        }
    }, [user, authLoading, router]);

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(Array.isArray(data.notifications) ? data.notifications : Array.isArray(data) ? data : []);
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

    async function fetchTemplates() {
        try {
            const res = await fetch('/api/notifications/templates');
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            const data = await res.json();
            setImage(data.url);
        } catch (err: any) {
            alert(err.message || 'Image upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    function applyTemplate(template: Template) {
        setTitle(template.title);
        setBody(template.body);
        if (template.image) setImage(template.image);
        if (template.url) setUrl(template.url);
        setPriority(template.priority || 'normal');
    }

    async function handleSaveTemplate() {
        if (!templateName.trim() || !title.trim() || !body.trim()) return;
        setSavingTemplate(true);
        try {
            const res = await fetch('/api/notifications/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: templateName.trim(),
                    title: title.trim(),
                    body: body.trim(),
                    image: image || undefined,
                    url: url || undefined,
                    priority,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save template');
            }

            setShowSaveTemplate(false);
            setTemplateName('');
            fetchTemplates();
        } catch (err: any) {
            alert(err.message || 'Failed to save template');
        } finally {
            setSavingTemplate(false);
        }
    }

    async function handleDeleteTemplate(id: string) {
        try {
            await fetch(`/api/notifications/templates/${id}`, { method: 'DELETE' });
            fetchTemplates();
        } catch (err) {
            console.error('Failed to delete template:', err);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;

        setSending(true);
        try {
            const payload: any = {
                title: title.trim(),
                body: body.trim(),
                url: url.trim() || '/',
                image: image || undefined,
                priority,
                targetType,
                targetId: targetType === 'ORGANISATION' ? targetId : undefined,
                sendNow,
            };

            if (!sendNow && scheduledAt) {
                payload.scheduledAt = new Date(scheduledAt).toISOString();
                payload.sendNow = false;
            }

            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create notification');
            }

            // Reset form
            resetForm();
            fetchNotifications();
        } catch (err: any) {
            alert(err.message || 'Failed to send notification');
        } finally {
            setSending(false);
        }
    }

    function resetForm() {
        setTitle('');
        setBody('');
        setUrl('');
        setImage('');
        setPriority('normal');
        setTargetType('ALL');
        setTargetId('');
        setSendNow(true);
        setScheduledAt('');
        setShowForm(false);
    }

    async function handleResend(id: string) {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/notifications/${id}?action=resend`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Resend failed');
            }
            fetchNotifications();
        } catch (err: any) {
            alert(err.message || 'Resend failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDelete(id: string) {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Delete failed');
            }
            setDeleteConfirm(null);
            fetchNotifications();
        } catch (err: any) {
            alert(err.message || 'Delete failed');
        } finally {
            setActionLoading(null);
        }
    }

    function handleClone(notif: NotificationItem) {
        setTitle(notif.title);
        setBody(notif.body);
        setUrl(notif.url || '');
        setImage(notif.image || '');
        setPriority(notif.priority || 'normal');
        setTargetType(notif.targetType === 'USER' ? 'ALL' : notif.targetType);
        setTargetId(notif.targetId || '');
        setSendNow(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function getStatusBadge(status: string, scheduledAt?: string) {
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
                        <Clock size={12} /> {scheduledAt
                            ? new Date(scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Scheduled'}
                    </span>
                );
            default:
                return null;
        }
    }

    function getTargetIcon(targetType: string) {
        switch (targetType) {
            case 'ALL': return <Globe size={14} className="text-indigo-400" />;
            case 'ORGANISATION': return <Building2 size={14} className="text-cyan-400" />;
            case 'USER': return <Users size={14} className="text-amber-400" />;
            default: return null;
        }
    }

    function getPriorityBadge(p: string) {
        if (p === 'urgent') {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                    <Zap size={10} /> URGENT
                </span>
            );
        }
        return null;
    }

    if (authLoading || loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    // Get min datetime for scheduling (now + 5 minutes)
    const minSchedule = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Send size={18} className="text-indigo-400" />
                            Create Notification
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Template Selector */}
                            {templates.length > 0 && (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                                    >
                                        <BookTemplate size={14} />
                                        Templates
                                        <ChevronDown size={12} />
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-60 overflow-y-auto">
                                        {templates.map((t) => (
                                            <div
                                                key={t._id}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => applyTemplate(t)}
                                                    className="flex-1 text-left"
                                                >
                                                    <p className="text-sm text-white font-medium truncate">{t.name}</p>
                                                    <p className="text-[11px] text-slate-500 truncate">{t.title}</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTemplate(t._id)}
                                                    className="ml-2 text-slate-600 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Save as Template */}
                            {title.trim() && body.trim() && (
                                <button
                                    type="button"
                                    onClick={() => setShowSaveTemplate(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                                >
                                    <Save size={14} />
                                    Save Template
                                </button>
                            )}
                        </div>
                    </div>

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

                        {/* URL + Image Row */}
                        <div className="grid grid-cols-2 gap-4">
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
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Banner Image <span className="text-slate-500">(optional)</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={image}
                                        onChange={(e) => setImage(e.target.value)}
                                        placeholder="Image URL or upload →"
                                        className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm"
                                    />
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 border border-white/10 rounded-xl text-slate-300 transition-colors disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Image Preview */}
                        {image && (
                            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-800/30">
                                <img src={image} alt="Preview" className="w-full h-40 object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImage('')}
                                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                                >
                                    <X size={14} className="text-white" />
                                </button>
                            </div>
                        )}

                        {/* Priority + Target Row */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPriority('normal')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                                            priority === 'normal'
                                                ? 'bg-slate-700 border-indigo-500/50 text-white'
                                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Bell size={14} /> Normal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPriority('urgent')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                                            priority === 'urgent'
                                                ? 'bg-red-500/15 border-red-500/50 text-red-400'
                                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Zap size={14} /> Urgent
                                    </button>
                                </div>
                            </div>

                            {/* Target */}
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

                            {targetType === 'ORGANISATION' ? (
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
                            ) : (
                                <div />
                            )}
                        </div>

                        {/* Send Mode: Send Now / Schedule */}
                        <div className="p-4 bg-slate-800/30 rounded-xl border border-white/5 space-y-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setSendNow(true); setScheduledAt(''); }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        sendNow ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Send size={14} /> Send Now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSendNow(false)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        !sendNow && scheduledAt ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                        !sendNow ? 'bg-slate-700 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Calendar size={14} /> Schedule
                                </button>
                                {!sendNow && !scheduledAt && (
                                    <button
                                        type="button"
                                        onClick={() => setSendNow(false)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-400"
                                    >
                                        <FileText size={14} /> Save as Draft
                                    </button>
                                )}
                            </div>

                            {/* Schedule date picker */}
                            {!sendNow && (
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-slate-400">Schedule for:</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) => setScheduledAt(e.target.value)}
                                        min={minSchedule}
                                        className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 [color-scheme:dark]"
                                    />
                                    {!scheduledAt && (
                                        <span className="text-xs text-slate-500">Leave empty to save as draft</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
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
                                    <><Loader2 size={16} className="animate-spin" /> Sending...</>
                                ) : sendNow ? (
                                    <><Send size={16} /> Send Now</>
                                ) : scheduledAt ? (
                                    <><Clock size={16} /> Schedule</>
                                ) : (
                                    <><FileText size={16} /> Save Draft</>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Save Template Modal */}
                    {showSaveTemplate && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSaveTemplate(false)}>
                            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="text-white font-semibold mb-3">Save as Template</h3>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Template name (e.g. Monthly Reminder)"
                                    maxLength={50}
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                                />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowSaveTemplate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={handleSaveTemplate}
                                        disabled={savingTemplate || !templateName.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                                    >
                                        {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                            className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors"
                        >
                            {/* Image banner */}
                            {notif.image && (
                                <div className="w-full h-32 bg-slate-800">
                                    <img src={notif.image} alt="" className="w-full h-full object-cover opacity-80" />
                                </div>
                            )}
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-sm font-semibold text-white truncate">{notif.title}</h3>
                                            {getStatusBadge(notif.status, notif.scheduledAt)}
                                            {getPriorityBadge(notif.priority)}
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2">{notif.body}</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
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
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                            {notif.createdBy && <span>by {notif.createdBy.name}</span>}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {/* Clone */}
                                        <button
                                            onClick={() => handleClone(notif)}
                                            title="Clone to new notification"
                                            className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Copy size={15} />
                                        </button>
                                        {/* Resend */}
                                        {notif.status === 'SENT' && (
                                            <button
                                                onClick={() => handleResend(notif._id)}
                                                disabled={actionLoading === notif._id}
                                                title="Resend this notification"
                                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === notif._id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                                            </button>
                                        )}
                                        {/* Delete */}
                                        {deleteConfirm === notif._id ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(notif._id)}
                                                    disabled={actionLoading === notif._id}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    {actionLoading === notif._id ? <Loader2 size={15} className="animate-spin" /> : 'Yes'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="p-2 text-slate-500 hover:text-white rounded-lg text-xs"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(notif._id)}
                                                title="Delete notification"
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={15} />
                                            </button>
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
