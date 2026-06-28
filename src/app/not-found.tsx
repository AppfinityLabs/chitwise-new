'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-4">
            <div className="text-6xl font-bold text-zinc-700">404</div>
            <h1 className="text-2xl font-semibold">Page Not Found</h1>
            <p className="text-zinc-400 text-sm">The page you are looking for does not exist.</p>
            <Link
                href="/"
                className="mt-4 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
                Back to Dashboard
            </Link>
        </div>
    );
}
