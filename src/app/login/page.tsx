'use client';

import { Suspense } from 'react';
import LoginForm from './LoginForm';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
