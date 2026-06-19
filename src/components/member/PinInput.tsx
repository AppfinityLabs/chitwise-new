'use client';

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
    length?: number;
    value: string;
    onChange: (val: string) => void;
    onComplete?: (val: string) => void;
    autoFocus?: boolean;
    mask?: boolean;
    disabled?: boolean;
}

/**
 * Segmented numeric PIN/OTP input. Mobile-friendly (numeric keyboard).
 */
export default function PinInput({
    length = 4,
    value,
    onChange,
    onComplete,
    autoFocus = true,
    mask = true,
    disabled = false,
}: PinInputProps) {
    const refs = useRef<Array<HTMLInputElement | null>>([]);

    const setDigit = (index: number, digit: string) => {
        const next = value.split('');
        next[index] = digit;
        const joined = next.join('').slice(0, length);
        onChange(joined);
        if (joined.length === length && onComplete) onComplete(joined);
    };

    const handleChange = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, '').slice(-1);
        if (!digit) {
            setDigit(index, '');
            return;
        }
        setDigit(index, digit);
        if (index < length - 1) refs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (value[index]) {
                setDigit(index, '');
            } else if (index > 0) {
                refs.current[index - 1]?.focus();
                setDigit(index - 1, '');
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            refs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            refs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (!pasted) return;
        onChange(pasted);
        const focusIndex = Math.min(pasted.length, length - 1);
        refs.current[focusIndex]?.focus();
        if (pasted.length === length && onComplete) onComplete(pasted);
    };

    return (
        <div className="flex justify-center gap-3">
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    type={mask ? 'password' : 'text'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    autoFocus={autoFocus && i === 0}
                    disabled={disabled}
                    value={value[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className={cn(
                        'h-14 w-12 rounded-xl border bg-zinc-900/60 text-center text-2xl font-bold text-white outline-none transition-all',
                        'border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30',
                        disabled && 'opacity-50'
                    )}
                />
            ))}
        </div>
    );
}
