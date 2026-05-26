import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
    name: 'BASIC' | 'PREMIUM';
    displayName: string;
    pricePerGroup: number;
    maxGroups: number | null; // null = unlimited
    maxAdmins: number;
    features: string[];
    status: 'ACTIVE' | 'DEPRECATED';
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>({
    name: { type: String, enum: ['BASIC', 'PREMIUM'], required: true, unique: true },
    displayName: { type: String, required: true },
    pricePerGroup: { type: Number, required: true },
    maxGroups: { type: Number, default: null }, // null = unlimited
    maxAdmins: { type: Number, default: 1 },
    features: [{ type: String }],
    status: { type: String, enum: ['ACTIVE', 'DEPRECATED'], default: 'ACTIVE' },
}, { timestamps: true });

export default mongoose.models.SubscriptionPlan || mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
