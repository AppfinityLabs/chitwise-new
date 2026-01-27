'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    // User is already authenticated, redirect to dashboard
                    router.push(redirect);
                }
            } catch (error) {
                // User is not authenticated, stay on login page
            } finally {
                setChecking(false);
            }
        };

        checkAuth();
    }, [router, redirect]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            // Login successful - redirect to original page or dashboard
            router.push(redirect);
            router.refresh();
        } catch (err) {
            setError('An error occurred during login');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking authentication
    if (checking) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-slate-950">
            {/* Left Side - Form Section */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-12 lg:px-24 xl:px-32 bg-slate-950 relative z-10">
                <div className="w-full max-w-md mx-auto">
                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4 shadow-lg shadow-indigo-500/20">
                            <span className="text-xl font-bold text-white">C</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">ChitWise</h1>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                            Welcome Back
                        </h2>
                        <p className="text-slate-400">
                            Please sign in to access your dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-400">
                                    <Mail size={20} className="text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 hover:border-slate-600/50"
                                    placeholder="Enter your email"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                    Password
                                </label>
                                <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 hover:border-slate-600/50"
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full primary-btn py-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    {/* Arrow icon that moves on hover */}
                                    <svg
                                        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer / Demo Creds */}
                    <div className="mt-10 border-t border-slate-800/50 pt-6">
                        <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10 mb-6">
                            <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">Demo Access</h4>
                            <div className="flex items-center justify-between text-sm">
                                <div>
                                    <span className="text-slate-500">Email:</span>
                                    <code className="ml-2 text-slate-300 font-mono bg-slate-900 px-1 py-0.5 rounded">admin@gmail.com</code>
                                </div>
                                <div>
                                    <span className="text-slate-500">Pass:</span>
                                    <code className="ml-2 text-slate-300 font-mono bg-slate-900 px-1 py-0.5 rounded">Admin@123</code>
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-slate-500 text-sm">
                            © 2026 ChitWise. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Branding Section (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
                {/* Background Image/Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-900 z-0">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-lg px-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 mb-8 shadow-2xl">
                        <span className="text-4xl font-bold text-white">C</span>
                    </div>

                    <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
                        Manage Your Chit Funds with <span className="text-indigo-300">Confidence</span>
                    </h2>

                    <p className="text-lg text-indigo-100/80 leading-relaxed mb-10">
                        Experience a simplified, secure, and transparent way to manage your chit groups, members, and collections all in one place.
                    </p>

                    {/* Stats/Feature Pills */}
                    <div className="flex flex-wrap justify-center gap-4">
                        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium">
                            🔒 Bank-Grade Security
                        </div>
                        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium">
                            📊 Real-time Analytics
                        </div>
                        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium">
                            🚀 Instant Updates
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>
        </div>
    );
}
