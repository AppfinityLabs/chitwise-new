'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Building2, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useOrganisations } from '@/lib/swr';
import { organisationsApi } from '@/lib/api';
import { invalidateAfterOrgMutation } from '@/lib/swr';

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function OrganisationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { data: organisations = [], isLoading } = useOrganisations();
    const [deleting, setDeleting] = useState<string | null>(null);

    if (!authLoading && user && user.role !== 'SUPER_ADMIN') {
        router.push('/');
        return null;
    }

    const handleDelete = async (orgId: string, orgName: string) => {
        if (!confirm(`Are you sure you want to delete "${orgName}"?\n\nThis action cannot be undone.`)) return;
        setDeleting(orgId);
        try {
            await organisationsApi.delete(orgId);
            await invalidateAfterOrgMutation();
            alert('Organisation deleted successfully');
        } catch (err: any) {
            alert(`Failed to delete organisation: ${err.message}`);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Organisations</h1>
                    <p className="text-zinc-400">Manage your business entities.</p>
                </div>
                <Link href="/organisations/new" className="primary-btn px-6 py-2 flex items-center gap-2">
                    <Plus size={18} />
                    <span>Add Organisation</span>
                </Link>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-card p-5 space-y-4">
                            <div className="flex justify-between"><div className="skeleton h-6 w-16 rounded" /><div className="skeleton h-6 w-16 rounded" /></div>
                            <div className="skeleton h-5 w-40 rounded" />
                            <div className="space-y-2"><div className="skeleton h-4 w-32 rounded" /><div className="skeleton h-4 w-44 rounded" /></div>
                        </div>
                    ))}
                </div>
            ) : organisations.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Building2 className="mx-auto mb-4 text-zinc-600" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">No Organisations Found</h3>
                    <p className="text-zinc-400 mb-6">Start by creating your first organisation.</p>
                    <Link href="/organisations/new" className="primary-btn px-6 py-2 inline-flex items-center gap-2">
                        <Plus size={18} />
                        <span>Add Organisation</span>
                    </Link>
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organisations.map((org: any) => (
                        <motion.div key={org._id} variants={itemVariants}>
                            <Link href={`/organisations/${org._id}`} className="relative group block">
                                <div className="glass-card hover:border-white/10 transition-all duration-300 overflow-hidden cursor-pointer h-full">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                                                {org.code}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${org.status === 'ACTIVE'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-zinc-700/50 text-zinc-400'
                                                }`}>
                                                {org.status}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors line-clamp-1">
                                            {org.name}
                                        </h3>

                                        <div className="space-y-2.5 mb-4">
                                            {org.phone ? (
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Phone size={14} className="text-indigo-400 flex-shrink-0" />
                                                    <span className="truncate">{org.phone}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                    <Phone size={14} className="flex-shrink-0" />
                                                    <span className="text-xs">No phone</span>
                                                </div>
                                            )}
                                            {org.email ? (
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Mail size={14} className="text-violet-400 flex-shrink-0" />
                                                    <span className="truncate">{org.email}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                    <Mail size={14} className="flex-shrink-0" />
                                                    <span className="text-xs">No email</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all pt-3 border-t border-white/5">
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/organisations/${org._id}/edit`); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800/50 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 transition-all"
                                                title="Edit organisation"
                                            >
                                                <Edit size={14} /><span>Edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(org._id, org.name); }}
                                                disabled={deleting === org._id}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800/50 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete organisation"
                                            >
                                                {deleting === org._id ? (<><Loader2 size={14} className="animate-spin" /><span>Deleting...</span></>) : (<><Trash2 size={14} /><span>Delete</span></>)}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
