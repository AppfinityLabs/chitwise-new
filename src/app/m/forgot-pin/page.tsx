'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Phone, ArrowLeft, KeyRound } from 'lucide-react';
import PinInput from '@/components/member/PinInput';
import { memberAuthApi, MemberApiError } from '@/lib/memberApi';

type Step = 'phone' | 'verify';

export default function ForgotPinPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const sendOtp = async () => {
        setError('');
        setInfo('');
        if (!/^\d{10}$/.test(phone.trim())) {
            setError('Enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            const res = await memberAuthApi.sendOtp(phone.trim());
            setStep('verify');
            setInfo(res.devOtp ? `Dev OTP: ${res.devOtp}` : 'OTP sent to your phone.');
        } catch (err) {
            setError(err instanceof MemberApiError ? err.message : 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const resetPin = async () => {
        setError('');
        if (otp.length !== 6) {
            setError('Enter the 6-digit OTP');
            return;
        }
        if (newPin.length !== 4) {
            setError('New PIN must be 4 digits');
            return;
        }
        if (newPin !== confirmPin) {
            setError('PINs do not match');
            return;
        }
        setLoading(true);
        try {
            await memberAuthApi.resetPin(phone.trim(), otp, newPin);
            router.replace('/m/login');
        } catch (err) {
            setError(err instanceof MemberApiError ? err.message : 'Failed to reset PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-10">
            <div className="mx-auto w-full max-w-sm">
                <Link href="/m/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
                    <ArrowLeft className="h-4 w-4" /> Back to login
                </Link>

                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                        <KeyRound className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Reset PIN</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        {step === 'phone' ? 'We will send an OTP to your registered phone' : 'Enter the OTP and choose a new PIN'}
                    </p>
                </div>

                <div className="space-y-6 rounded-2xl border border-white/5 bg-zinc-900/50 p-6 shadow-xl">
                    {step === 'phone' ? (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Phone Number</label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        placeholder="9876543210"
                                        className="w-full rounded-xl border border-white/10 bg-zinc-900/60 py-3 pl-10 pr-3 text-white placeholder:text-zinc-600 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>
                            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{error}</p>}
                            <button
                                onClick={sendOtp}
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-60"
                            >
                                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                                Send OTP
                            </button>
                        </>
                    ) : (
                        <>
                            {info && <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-center text-sm text-indigo-300">{info}</p>}
                            <div>
                                <label className="mb-2 block text-center text-xs font-medium text-zinc-400">Enter OTP</label>
                                <PinInput length={6} value={otp} onChange={setOtp} mask={false} />
                            </div>
                            <div>
                                <label className="mb-2 block text-center text-xs font-medium text-zinc-400">New PIN</label>
                                <PinInput value={newPin} onChange={setNewPin} autoFocus={false} />
                            </div>
                            <div>
                                <label className="mb-2 block text-center text-xs font-medium text-zinc-400">Confirm PIN</label>
                                <PinInput value={confirmPin} onChange={setConfirmPin} autoFocus={false} />
                            </div>
                            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{error}</p>}
                            <button
                                onClick={resetPin}
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:opacity-60"
                            >
                                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                                Reset PIN
                            </button>
                            <button
                                onClick={() => { setStep('phone'); setOtp(''); setNewPin(''); setConfirmPin(''); setError(''); }}
                                className="w-full text-center text-sm text-zinc-400 hover:text-zinc-200"
                            >
                                Change phone number
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
