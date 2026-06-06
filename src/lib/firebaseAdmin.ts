import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

/**
 * Lazily initialise the Firebase Admin SDK (for sending FCM push to the
 * mobile app). Reads credentials from either:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON  (raw JSON string, e.g. on Vercel)
 *   - FIREBASE_SERVICE_ACCOUNT_PATH  (path to a JSON file, e.g. local dev)
 */
let initialised = false;

function loadServiceAccount(): admin.ServiceAccount | null {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawJson) {
        try {
            return JSON.parse(rawJson) as admin.ServiceAccount;
        } catch (e) {
            console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e);
            return null;
        }
    }

    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (filePath) {
        try {
            const resolved = path.isAbsolute(filePath)
                ? filePath
                : path.join(process.cwd(), filePath);
            const content = fs.readFileSync(resolved, 'utf8');
            return JSON.parse(content) as admin.ServiceAccount;
        } catch (e) {
            console.error('Failed to read FIREBASE_SERVICE_ACCOUNT_PATH:', e);
            return null;
        }
    }

    return null;
}

export function getFirebaseAdmin(): typeof admin | null {
    if (initialised) {
        return admin.apps.length ? admin : null;
    }
    initialised = true;

    if (admin.apps.length) {
        return admin;
    }

    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
        console.warn('Firebase Admin not configured — FCM push disabled.');
        return null;
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    return admin;
}

export function isFcmConfigured(): boolean {
    return getFirebaseAdmin() !== null;
}

/**
 * Send an FCM message to a single device token.
 * Returns true on success, false on failure. Invalid tokens are reported
 * via the `invalidToken` flag so the caller can prune them.
 */
export async function sendFcmToToken(
    token: string,
    payload: {
        title: string;
        body: string;
        url?: string;
        image?: string;
        priority?: 'normal' | 'urgent';
        data?: Record<string, string>;
    }
): Promise<{ success: boolean; invalidToken: boolean }> {
    const fb = getFirebaseAdmin();
    if (!fb) return { success: false, invalidToken: false };

    try {
        await fb.messaging().send({
            token,
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.image ? { imageUrl: payload.image } : {}),
            },
            data: {
                url: payload.url || '/',
                priority: payload.priority || 'normal',
                ...(payload.data || {}),
            },
            android: {
                priority: payload.priority === 'urgent' ? 'high' : 'normal',
                notification: {
                    channelId: 'chitwise_default',
                    ...(payload.image ? { imageUrl: payload.image } : {}),
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                    },
                },
            },
        });
        return { success: true, invalidToken: false };
    } catch (error: any) {
        const code = error?.errorInfo?.code || error?.code;
        const invalidToken =
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument';
        if (!invalidToken) {
            console.error('FCM send error:', error);
        }
        return { success: false, invalidToken };
    }
}
