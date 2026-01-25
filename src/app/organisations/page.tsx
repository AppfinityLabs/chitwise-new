'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Building2, Mail, Phone, Edit, Trash2 } from 'lucide-react';

interface Organisation {
    _id: string;
    name: string;
    code: string;
    phone?: string;
    email?: string;
    status: string;
    createdAt: string;
}

export default function OrganisationsPage() {
    const router = useRouter();
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchOrganisations();
    }, []);

    const fetchOrganisations = () => {
        fetch('/api/organisations')
            .then((res) => res.json())
            .then((data) => {
                setOrganisations(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleDelete = async (orgId: string, orgName: string) => {
        if (!confirm(`Are you sure you want to delete "${orgName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        setDeleting(orgId);
        try {
            const res = await fetch(`/api/organisations/${orgId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setOrganisations(organisations.filter(o => o._id !== orgId));
                alert('Organisation deleted successfully');
            } else {
                const error = await res.json();
                alert(`Failed to delete organisation: ${error.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting organisation');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Organisations</h1>
                    <p className="text-slate-400">Manage your business entities.</p>
                </div>
                <Link href="/organisations/new" className="primary-btn px-6 py-2 flex items-center gap-2">
                    <Plus size={18} />
                    <span>Add Organisation</span>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : organisations.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Building2 className="mx-auto mb-4 text-slate-600" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">No Organisations Found</h3>
                    <p className="text-slate-400 mb-6">Start by creating your first organisation.</p>
                    <Link href="/organisations/new" className="primary-btn px-6 py-2 inline-flex items-center gap-2">
                        <Plus size={18} />
                        <span>Add Organisation</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organisations.map((org) => (
                        <Link 
                            key={org._id} 
                            href={`/organisations/${org._id}`}
                            className="relative group block"
                        >
                            <div className="glass-card hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden cursor-pointer h-full">
                                {/* Hover Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Card Content */}
                                <div className="relative z-10 p-5">
                                    {/* Header with Code and Status */}
                                    <div className="flex items-start justify-between mb-4">
                                        <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                                            {org.code}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${
                                            org.status === 'ACTIVE' 
                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                : 'bg-slate-700/50 text-slate-400'
                                        }`}>
                                            {org.status}
                                        </span>
                                    </div>

                                    {/* Organisation Name */}
                                    <h3 className="text-lg font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors line-clamp-1">
                                        {org.name}
                                    </h3>

                                    {/* Contact Information */}
                                    <div className="space-y-2.5 mb-4">
                                        {org.phone ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Phone size={14} className="text-indigo-400 flex-shrink-0" />
                                                <span className="truncate">{org.phone}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone size={14} className="flex-shrink-0" />
                                                <span className="text-xs">No phone</span>
                                            </div>
                                        )}

                                        {org.email ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Mail size={14} className="text-violet-400 flex-shrink-0" />
                                                <span className="truncate">{org.email}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Mail size={14} className="flex-shrink-0" />
                                                <span className="text-xs">No email</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all pt-3 border-t border-white/5">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.push(`/organisations/${org._id}/edit`);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/50 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition-all"
                                            title="Edit organisation"
                                        >
                                            <Edit size={14} />
                                            <span>Edit</span>
                                        </button>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(org._id, org.name);
                                            }}
                                            disabled={deleting === org._id}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Delete organisation"
                                        >
                                            {deleting === org._id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span>Deleting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={14} />
                                                    <span>Delete</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
