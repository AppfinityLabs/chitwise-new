import mongoose, { Schema, Document } from 'mongoose';

export interface IOrgSubscription extends Document {
    organisationId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId | null;
    planName: 'BASIC' | 'PREMIUM' | null;
    pricePerGroup: number;
    maxGroups: number | null;
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    trialStartDate: Date;
    trialEndDate: Date;
    startDate: Date | null;
    paidThroughDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const OrgSubscriptionSchema = new Schema<IOrgSubscription>({
    organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true, unique: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    planName: { type: String, enum: ['BASIC', 'PREMIUM', null], default: null },
    pricePerGroup: { type: Number, default: 0 },
    maxGroups: { type: Number, default: null },
    status: { type: String, enum: ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'TRIAL' },
    trialStartDate: { type: Date, required: true },
    trialEndDate: { type: Date, required: true },
    startDate: { type: Date, default: null },
    paidThroughDate: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.OrgSubscription || mongoose.model<IOrgSubscription>('OrgSubscription', OrgSubscriptionSchema);
