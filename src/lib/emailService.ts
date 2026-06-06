import AppSettings from '@/models/AppSettings';

/**
 * Provider-agnostic email service.
 *
 * Currently implemented against the Resend HTTP API (no SDK dependency — uses
 * fetch). Configure via env:
 *   RESEND_API_KEY  – API key (required to enable sending)
 *   EMAIL_FROM      – default From address, e.g. "ChitWise <noreply@yourdomain>"
 *
 * Sending is additionally gated by the global AppSettings.emailEnabled toggle.
 * If unconfigured or disabled, all calls are safe no-ops.
 */

export function isEmailConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
}

export interface SendEmailResult {
    sent: boolean;
    skipped?: boolean;
    reason?: string;
    id?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
    if (!isEmailConfigured()) {
        return { sent: false, skipped: true, reason: 'Email not configured' };
    }

    const recipients = Array.isArray(opts.to) ? opts.to.filter(Boolean) : [opts.to].filter(Boolean);
    if (recipients.length === 0) {
        return { sent: false, skipped: true, reason: 'No recipients' };
    }

    // Respect the global enable toggle and use configured sender metadata
    let fromName = 'ChitWise';
    let replyTo = opts.replyTo;
    try {
        const settings: any = await AppSettings.findOne({ key: 'GLOBAL' }).lean();
        if (settings && settings.emailEnabled === false) {
            return { sent: false, skipped: true, reason: 'Email disabled in settings' };
        }
        if (settings?.notificationFromName) fromName = settings.notificationFromName;
        if (!replyTo && settings?.notificationReplyTo) replyTo = settings.notificationReplyTo;
    } catch {
        // settings unavailable — proceed with defaults
    }

    const from =
        opts.from ||
        process.env.EMAIL_FROM ||
        `${fromName} <onboarding@resend.dev>`;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: recipients,
                subject: opts.subject,
                html: opts.html,
                text: opts.text,
                ...(replyTo ? { reply_to: replyTo } : {}),
            }),
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            console.error('Email send failed:', res.status, detail);
            return { sent: false, reason: `Provider error ${res.status}` };
        }

        const data = await res.json().catch(() => ({}));
        return { sent: true, id: data?.id };
    } catch (e) {
        console.error('Email send error:', e);
        return { sent: false, reason: 'Request failed' };
    }
}
