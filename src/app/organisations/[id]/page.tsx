'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Phone,
    Mail,
    Edit,
    Trash2,
    ArrowLeft,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

interface Organisation {
    _id: string;
    name: string;
    code: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
    panNumber?: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
}

export default function OrganisationDetail() {
    const params = useParams();
    const router = useRouter();
    const [organisation, setOrganisation] = useState<Organisation | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchOrganisation();
    }, [params.id]);

    const fetchOrganisation = async () => {
        try {
            const res = await fetch(`/api/organisations/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setOrganisation(data);
            }
        } catch (error) {
            console.error('Failed to fetch organisation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${organisation?.name}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch(`/api/organisations/${params.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                router.push('/organisations');
            } else {
                alert('Failed to delete organisation');
            }
        } catch (error) {
            console.error('Failed to delete organisation:', error);
            alert('Failed to delete organisation');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!organisation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-zinc-400">Organisation not found</p>
                <Link href="/organisations" className="text-indigo-400 hover:text-indigo-300">
                    Back to Organisations
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/organisations"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors mb-6"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Organisations</span>
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-3">{organisation.name}</h1>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {organisation.code}
                            </span>
                            {organisation.phone && (
                                <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                                    <Phone size={14} />
                                    {organisation.phone}
                                </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-md ${organisation.status === 'ACTIVE'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-zinc-700/50 text-zinc-400'
                                }`}>
                                {organisation.status}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Link
                            href={`/organisations/${organisation._id}/edit`}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 transition-colors"
                        >
                            Edit
                        </Link>

                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="glass-card p-6">
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                        Basic Information
                    </h2>

                    <div className="space-y-4">
                        {organisation.description && (
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                                <p className="text-white">{organisation.description}</p>
                            </div>
                        )}

                        {organisation.address && (
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Address</label>
                                <p className="text-white">{organisation.address}</p>
                            </div>
                        )}

                        {organisation.email && (
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                                <a
                                    href={`mailto:${organisation.email}`}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {organisation.email}
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tax Information */}
                <div className="glass-card p-6">
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                        Tax Information
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">GST Number</label>
                            <p className="text-white font-mono">
                                {organisation.gstNumber || <span className="text-zinc-600">Not provided</span>}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">PAN Number</label>
                            <p className="text-white font-mono">
                                {organisation.panNumber || <span className="text-zinc-600">Not provided</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
