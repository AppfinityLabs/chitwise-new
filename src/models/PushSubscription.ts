import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
    userId?: mongoose.Types.ObjectId;
    memberId?: mongoose.Types.ObjectId;
    organisationId?: mongoose.Types.ObjectId;
    platform: 'web' | 'flutter';
    fcmToken?: string;
    subscription?: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    };
    userAgent?: string;
    createdAt: Date;
    lastUsed?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    memberId: {
        type: Schema.Types.ObjectId,
        ref: 'Member',
        index: true
    },
    organisationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        index: true
    },
    platform: {
        type: String,
        enum: ['web', 'flutter'],
        default: 'web',
        index: true
    },
    // FCM token for mobile (flutter) subscriptions
    fcmToken: {
        type: String
    },
    // Web-push subscription (browser). Optional for mobile subscriptions.
    subscription: {
        endpoint: { type: String },
        keys: {
            p256dh: { type: String },
            auth: { type: String }
        }
    },
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    lastUsed: Date
});

// Compound indexes for efficient lookups
PushSubscriptionSchema.index({ userId: 1, 'subscription.endpoint': 1 });
PushSubscriptionSchema.index({ memberId: 1, 'subscription.endpoint': 1 });
PushSubscriptionSchema.index({ userId: 1, fcmToken: 1 });

// Unique only when the field actually exists (web docs have endpoint,
// mobile docs have fcmToken) to avoid null-collision on the other transport.
PushSubscriptionSchema.index(
    { 'subscription.endpoint': 1 },
    {
        unique: true,
        partialFilterExpression: { 'subscription.endpoint': { $exists: true } },
        name: 'subscription.endpoint_unique_partial'
    }
);
PushSubscriptionSchema.index(
    { fcmToken: 1 },
    {
        unique: true,
        partialFilterExpression: { fcmToken: { $exists: true } },
        name: 'fcmToken_unique_partial'
    }
);

export default mongoose.models.PushSubscription ||
    mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
