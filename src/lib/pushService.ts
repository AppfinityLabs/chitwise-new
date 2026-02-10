import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';
import GroupMember from '@/models/GroupMember';
import dbConnect from './db';

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@chitwise.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    image?: string;
    badge?: string;
    tag?: string;
    priority?: 'normal' | 'urgent';
    data?: Record<string, any>;
}

/**
 * Send push notification to a specific subscription
 */
export async function sendToSubscription(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: PushPayload
): Promise<boolean> {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys
            },
            JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || '/icons/icon-192.png',
                badge: payload.badge || '/icons/icon-192.png',
                url: payload.url || '/',
                tag: payload.tag,
                priority: payload.priority || 'normal',
                data: payload.data,
                ...(payload.image ? { image: payload.image } : {}),
            })
        );
        console.log('✅ Push sent successfully to:', subscription.endpoint.substring(0, 60) + '...');
        return true;
    } catch (error: any) {
        // Handle expired/invalid subscriptions
        if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription is no longer valid, remove it
            await PushSubscription.deleteOne({ 'subscription.endpoint': subscription.endpoint });
            console.log('Removed invalid subscription:', subscription.endpoint);
        } else {
            console.error('Push notification error:', error);
        }
        return false;
    }
}

/**
 * Send push notification to all devices for a specific user
 */
export async function sendToUser(
    userId: string,
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    await dbConnect();

    const subscriptions = await PushSubscription.find({ userId });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        const success = await sendToSubscription(sub.subscription, payload);
        if (success) {
            sent++;
            // Update last used timestamp
            sub.lastUsed = new Date();
            await sub.save();
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Send push notification to all users in an organisation
 */
export async function sendToOrganisation(
    organisationId: string,
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    await dbConnect();

    const subscriptions = await PushSubscription.find({ organisationId });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        const success = await sendToSubscription(sub.subscription, payload);
        if (success) {
            sent++;
            sub.lastUsed = new Date();
            await sub.save();
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Get the VAPID public key (for client-side subscription)
 */
export function getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
    return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Send push notification to a specific member's devices
 */
export async function sendToMember(
    memberId: string,
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    await dbConnect();

    const subscriptions = await PushSubscription.find({ memberId });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        const success = await sendToSubscription(sub.subscription, payload);
        if (success) {
            sent++;
            sub.lastUsed = new Date();
            await sub.save();
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Send push notification to all members enrolled in a group
 */
export async function sendToGroup(
    groupId: string,
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    await dbConnect();

    // Find all active subscriptions for this group
    const groupMembers = await GroupMember.find({ groupId, status: 'ACTIVE' }).select('memberId');
    const memberIds = groupMembers.map((gm: any) => gm.memberId);

    if (memberIds.length === 0) return { sent: 0, failed: 0 };

    const subscriptions = await PushSubscription.find({ memberId: { $in: memberIds } });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        const success = await sendToSubscription(sub.subscription, payload);
        if (success) {
            sent++;
            sub.lastUsed = new Date();
            await sub.save();
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Interpolate template variables in notification text.
 * Replaces {{variableName}} with provided values.
 * Example: interpolateTemplate("Hello {{memberName}}, you owe {{amount}}", { memberName: "John", amount: "₹5000" })
 */
export function interpolateTemplate(
    template: string,
    variables: Record<string, string | number>
): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? String(variables[key]) : match;
    });
}
