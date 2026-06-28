'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-4">
            <div className="text-6xl font-bold text-rose-700">!</div>
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-zinc-400 text-sm max-w-md text-center">
                An unexpected error occurred. You can try again or return to the dashboard.
            </p>
            <div className="flex gap-3 mt-4">
                <button
                    onClick={reset}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                >
                    Try Again
                </button>
                <a
                    href="/"
                    className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                >
                    Dashboard
                </a>
            </div>
        </div>
    );
}
