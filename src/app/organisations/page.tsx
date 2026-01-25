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
                <div className="space-y-4">
                    {organisations.map((org) => (
                        <Link 
                            key={org._id} 
                            href={`/organisations/${org._id}`}
                            className="relative group block"
                        >
                            <div className="glass-card hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden cursor-pointer">
                                {/* Hover Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Card Content */}
                                <div className="relative z-10 p-6">
                                    <div className="flex items-center justify-between gap-6">
                                        {/* Left Section - Organization Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-4 mb-3">
                                                {/* Code Label */}
                                                <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold">
                                                    {org.code}
                                                </span>
                                                
                                                {/* Status Badge */}
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                                                    org.status === 'ACTIVE' 
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                                                    {org.status}
                                                </span>

                                                {/* Creation Date */}
                                                <span className="text-xs text-slate-500">
                                                    Created {new Date(org.createdAt).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric' 
                                                    })}
                                                </span>
                                            </div>

                                            {/* Organisation Name */}
                                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                                                {org.name}
                                            </h3>

                                            {/* Contact Information - Horizontal Layout */}
                                            <div className="flex items-center gap-6 text-sm">
                                                {org.phone ? (
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Phone size={14} className="text-indigo-400" />
                                                        <span>{org.phone}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Phone size={14} />
                                                        <span className="text-xs">No phone</span>
                                                    </div>
                                                )}

                                                {org.email ? (
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Mail size={14} className="text-violet-400" />
                                                        <span className="truncate max-w-xs">{org.email}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Mail size={14} />
                                                        <span className="text-xs">No email</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Section - Action Buttons */}
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    router.push(`/organisations/${org._id}/edit`);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition-all border border-white/5 hover:border-amber-500/30"
                                                title="Edit organisation"
                                            >
                                                <Edit size={16} />
                                                <span className="text-sm font-medium">Edit</span>
                                            </button>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDelete(org._id, org.name);
                                                }}
                                                disabled={deleting === org._id}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all border border-white/5 hover:border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete organisation"
                                            >
                                                {deleting === org._id ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        <span className="text-sm font-medium">Deleting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 size={16} />
                                                        <span className="text-sm font-medium">Delete</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
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
