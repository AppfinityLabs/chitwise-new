import crypto from 'crypto';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY || '';
const OTP_EXPIRY_MINUTES = 5;

/**
 * Generate a 6-digit OTP
 */
export function generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Get OTP expiry date
 */
export function getOtpExpiry(): Date {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Send OTP via MSG91 (WhatsApp + SMS fallback)
 * Cost: ~₹0.10 per OTP for India
 */
export async function sendOtpViaMSG91(phone: string, otp: string): Promise<boolean> {
    if (!MSG91_AUTH_KEY) {
        console.error('[OTP] MSG91_AUTH_KEY not configured');
        return false;
    }

    try {
        // MSG91 SendOTP API
        const response = await fetch('https://control.msg91.com/api/v5/otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authkey': MSG91_AUTH_KEY,
            },
            body: JSON.stringify({
                template_id: MSG91_TEMPLATE_ID,
                mobile: phone,
                otp: otp,
            }),
        });

        const data = await response.json();
        if (data.type === 'success') {
            console.log(`[OTP] MSG91 sent successfully to ${phone.slice(-4)}`);
            return true;
        }
        console.error('[OTP] MSG91 error:', data);
        return false;
    } catch (error) {
        console.error('[OTP] MSG91 send failed:', error);
        return false;
    }
}

/**
 * Verify OTP via MSG91
 */
export async function verifyOtpViaMSG91(phone: string, otp: string): Promise<boolean> {
    if (!MSG91_AUTH_KEY) return false;

    try {
        const response = await fetch(
            `https://control.msg91.com/api/v5/otp/verify?mobile=${phone}&otp=${otp}`,
            {
                method: 'GET',
                headers: { 'authkey': MSG91_AUTH_KEY },
            }
        );
        const data = await response.json();
        return data.type === 'success';
    } catch (error) {
        console.error('[OTP] MSG91 verify failed:', error);
        return false;
    }
}

/**
 * Send OTP via Firebase (using Identity Toolkit REST API for server-side)
 * Note: Firebase Phone Auth is primarily client-side.
 * For server-side verification, we use custom OTP + Firebase as client verifier.
 * 
 * In hybrid mode: Flutter app uses Firebase Auth SDK directly for OTP send/verify.
 * This backend method is for fallback when Firebase quota is exceeded.
 */
export async function sendOtpViaFirebase(phone: string): Promise<{ success: boolean; sessionInfo?: string }> {
    if (!FIREBASE_API_KEY) {
        return { success: false };
    }

    try {
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: phone,
                    recaptchaToken: 'BYPASS_FOR_TESTING', // In production, use real token
                }),
            }
        );
        const data = await response.json();
        if (data.sessionInfo) {
            return { success: true, sessionInfo: data.sessionInfo };
        }
        return { success: false };
    } catch (error) {
        console.error('[OTP] Firebase send failed:', error);
        return { success: false };
    }
}

/**
 * Determine which provider to use
 * Primary: Firebase (free 10K/month)
 * Fallback: MSG91 (₹0.10/OTP for India WhatsApp)
 */
export type OtpProvider = 'firebase' | 'msg91';

export function getActiveProvider(): OtpProvider {
    // If MSG91 is configured, use it as backend OTP sender
    // Firebase is handled client-side in Flutter
    if (MSG91_AUTH_KEY) return 'msg91';
    return 'firebase';
}
