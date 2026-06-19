'use client';

// =============================================================================
// Member PWA API Client (same-origin, cookie-based auth)
// Mirrors src/lib/api.ts but scoped to /api/member/* endpoints.
// =============================================================================

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
}

export class MemberApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'MemberApiError';
    }
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
    };

    if (body !== undefined) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, config);

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Something went wrong' }));
        throw new MemberApiError(err.error || err.message || 'Request failed', response.status);
    }

    // Some endpoints may return empty body
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
}

// SWR fetcher
export const memberFetcher = <T>(endpoint: string) => api<T>(endpoint);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const memberAuthApi = {
    login: (phone: string, pin: string) =>
        api<{ message: string; member: MemberSummary }>('/api/member/auth/login', {
            method: 'POST',
            body: { phone, pin },
        }),
    // OTP login — Step 1: verify the number is registered before Firebase sends an OTP
    checkMember: (phone: string) =>
        api<{ ok: true }>('/api/member/auth/otp/check', {
            method: 'POST',
            body: { phone },
        }),
    // OTP login — Step 2: exchange a verified Firebase ID token for a member session
    verifyFirebaseLogin: (firebaseIdToken: string) =>
        api<{ message: string; member: MemberSummary }>('/api/member/auth/otp/verify', {
            method: 'POST',
            body: { firebaseIdToken },
        }),
    me: () => api<MemberMe>('/api/member/auth/me'),
    logout: () => api<{ message: string }>('/api/member/auth/logout', { method: 'POST' }),
    changePin: (currentPin: string, newPin: string) =>
        api<{ message: string }>('/api/member/auth/change-pin', {
            method: 'PUT',
            body: { currentPin, newPin },
        }),
    sendOtp: (phone: string) =>
        api<{ message: string; devOtp?: string }>('/api/member/auth/forgot-pin/send-otp', {
            method: 'POST',
            body: { phone },
        }),
    resetPin: (phone: string, otp: string, newPin: string) =>
        api<{ message: string }>('/api/member/auth/forgot-pin/reset', {
            method: 'POST',
            body: { phone, otp, newPin },
        }),
};

// ─── Data ──────────────────────────────────────────────────────────────────────
export const memberApi = {
    profileUpdate: (data: { name?: string; email?: string; address?: string }) =>
        api<MemberMe>('/api/member/profile', { method: 'PUT', body: data }),
    pushSubscribe: (subscription: unknown) =>
        api<{ message: string }>('/api/member/push/subscribe', {
            method: 'POST',
            body: { subscription },
        }),
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface MemberSummary {
    id: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
    organisationName: string;
}

export interface MemberMe {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    status: string;
    kycVerified: boolean;
    organisationId: string;
    organisationName: string;
    createdAt: string;
}
