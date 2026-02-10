import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
    userId?: mongoose.Types.ObjectId;
    memberId?: mongoose.Types.ObjectId;
    organisationId?: mongoose.Types.ObjectId;
    subscription: {
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
    subscription: {
        endpoint: { type: String, required: true, unique: true },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true }
        }
    },
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    lastUsed: Date
});

// Compound indexes for efficient lookups
PushSubscriptionSchema.index({ userId: 1, 'subscription.endpoint': 1 });
PushSubscriptionSchema.index({ memberId: 1, 'subscription.endpoint': 1 });

export default mongoose.models.PushSubscription ||
    mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
