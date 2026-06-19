'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, ShieldCheck, ArrowLeft, MessageSquareText } from 'lucide-react';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult,
} from 'firebase/auth';
import PinInput from '@/components/member/PinInput';
import { memberAuthApi, MemberApiError } from '@/lib/memberApi';
import { useMemberAuth } from '@/context/MemberAuthContext';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type Step = 'phone' | 'otp';

const RESEND_SECONDS = 30;

export default function MemberLoginPage() {
    const router = useRouter();
    const { refresh } = useMemberAuth();
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [resendIn, setResendIn] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
    const confirmationRef = useRef<ConfirmationResult | null>(null);

    // If already authenticated, go to dashboard.
    useEffect(() => {
        memberAuthApi.me()
            .then(() => router.replace('/m/dashboard'))
            .catch(() => setChecking(false));
    }, [router]);

    // Set up an invisible reCAPTCHA verifier once.
    const getRecaptcha = useCallback(() => {
        if (recaptchaRef.current) return recaptchaRef.current;
        const auth = getFirebaseAuth();
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
        });
        return recaptchaRef.current;
    }, []);

    // Cleanup reCAPTCHA on unmount.
    useEffect(() => {
        return () => {
            recaptchaRef.current?.clear();
            recaptchaRef.current = null;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Resend countdown
    useEffect(() => {
        if (resendIn <= 0) return;
        timerRef.current = setInterval(() => {
            setResendIn((s) => {
                if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
                return s - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [resendIn]);

    const sendOtp = useCallback(async () => {
        setError('');
        setInfo('');
        const trimmed = phone.trim();
        if (!/^\d{10}$/.test(trimmed)) {
            setError('Enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            // 1) Gate: only proceed if the number belongs to a registered member.
            await memberAuthApi.checkMember(trimmed);

            // 2) Firebase sends the OTP (client-side) via SMS.
            const auth = getFirebaseAuth();
            const confirmation = await signInWithPhoneNumber(auth, `+91${trimmed}`, getRecaptcha());
            confirmationRef.current = confirmation;

            setStep('otp');
            setOtp('');
            setResendIn(RESEND_SECONDS);
            setInfo(`OTP sent to +91 ${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`);
        } catch (err) {
            if (err instanceof MemberApiError) {
                setError(err.message);
            } else {
                const code = (err as { code?: string })?.code || '';
                if (code === 'auth/too-many-requests') setError('Too many attempts. Please try again later.');
                else if (code === 'auth/invalid-phone-number') setError('Invalid phone number.');
                else if (code === 'auth/invalid-app-credential' || code === 'auth/app-not-authorized') {
                    setError('OTP service is not configured for this site yet. Please contact support.');
                } else setError('Failed to send OTP. Please try again.');
            }
            // Reset reCAPTCHA so a retry gets a fresh token.
            recaptchaRef.current?.clear();
            recaptchaRef.current = null;
        } finally {
            setLoading(false);
        }
    }, [phone, getRecaptcha]);

    const verifyOtp = useCallback(async (otpValue?: string) => {
        const finalOtp = otpValue ?? otp;
        setError('');
        if (finalOtp.length !== 6) {
            setError('Enter the 6-digit OTP');
            return;
        }
        if (!confirmationRef.current) {
            setError('Session expired. Please request a new OTP.');
            return;
        }
        setLoading(true);
        try {
            // Confirm OTP with Firebase, then exchange the ID token for a session.
            const cred = await confirmationRef.current.confirm(finalOtp);
            const idToken = await cred.user.getIdToken();
            await memberAuthApi.verifyFirebaseLogin(idToken);
            await refresh();
            router.replace('/m/dashboard');
        } catch (err) {
            if (err instanceof MemberApiError) {
                setError(err.message);
            } else {
                const code = (err as { code?: string })?.code || '';
                if (code === 'auth/invalid-verification-code') setError('Invalid OTP. Please check and try again.');
                else if (code === 'auth/code-expired') setError('OTP expired. Please request a new one.');
                else setError('Verification failed. Please try again.');
            }
            setOtp('');
        } finally {
            setLoading(false);
        }
    }, [otp, refresh, router]);

    const changeNumber = () => {
        setStep('phone');
        setOtp('');
        setError('');
        setInfo('');
        setResendIn(0);
        confirmationRef.current = null;
    };

    if (checking) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-[100dvh] flex-col justify-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
            <div id="recaptcha-container" />
            <div className="mx-auto w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                        <span className="text-2xl font-bold text-white">C</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">ChitWise Member</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        {step === 'phone' ? 'Sign in to view your chit groups' : 'Enter the OTP we sent you'}
                    </p>
                </div>

                {step === 'phone' ? (
                    <form
                        onSubmit={(e) => { e.preventDefault(); sendOtp(); }}
                        className="space-y-6 rounded-2xl border border-white/5 bg-zinc-900/50 p-6 shadow-xl"
                    >
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Phone Number</label>
                            <div className="relative">
                                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="9876543210"
                                    className="w-full rounded-xl border border-white/10 bg-zinc-900/60 py-3 pl-10 pr-3 text-white placeholder:text-zinc-600 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-5 w-5" />}
                            {loading ? 'Sending OTP…' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form
                        onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}
                        className="space-y-6 rounded-2xl border border-white/5 bg-zinc-900/50 p-6 shadow-xl"
                    >
                        <button
                            type="button"
                            onClick={changeNumber}
                            className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            +91 {phone}
                        </button>

                        <div>
                            <label className="mb-3 block text-center text-xs font-medium text-zinc-400">6-Digit OTP</label>
                            <PinInput
                                length={6}
                                value={otp}
                                onChange={setOtp}
                                onComplete={(v) => verifyOtp(v)}
                                autoFocus
                                mask={false}
                            />
                        </div>

                        {info && !error && (
                            <p className="text-center text-xs text-emerald-400">{info}</p>
                        )}
                        {error && (
                            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                            {loading ? 'Verifying…' : 'Verify & Sign In'}
                        </button>

                        <div className="text-center">
                            {resendIn > 0 ? (
                                <p className="text-sm text-zinc-500">Resend OTP in {resendIn}s</p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={sendOtp}
                                    disabled={loading}
                                    className="text-sm text-indigo-400 transition-colors hover:text-indigo-300 disabled:opacity-60"
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </form>
                )}

                <p className="mt-6 text-center text-xs text-zinc-600">
                    Contact your chit organisation if your number isn&apos;t registered.
                </p>
            </div>
        </div>
    );
}
