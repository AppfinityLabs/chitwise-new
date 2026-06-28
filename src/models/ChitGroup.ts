import mongoose, { Schema, Document } from 'mongoose';

export interface IChitGroup extends Document {
    groupName: string;
    description?: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    contributionAmount: number;
    totalUnits: number;
    totalPeriods: number;
    commissionValue: number;
    allowCustomCollectionPattern: boolean;
    subscriptionAmount?: number;
    subscriptionFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    startDate: Date;
    endDate?: Date;
    currentPeriod: number;
    status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED';
    organisationId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ChitGroupSchema = new Schema<IChitGroup>({
    groupName: { type: String, required: true },
    description: { type: String },
    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], required: true },
    contributionAmount: { type: Number, required: true, min: [1, 'Contribution amount must be at least 1'] },
    totalUnits: { type: Number, required: true, min: [1, 'Total units must be at least 1'] },
    totalPeriods: { type: Number, required: true, min: [1, 'Total periods must be at least 1'] },
    commissionValue: { type: Number, required: true, min: [0, 'Commission value cannot be negative'] },
    allowCustomCollectionPattern: { type: Boolean, default: false },
    subscriptionAmount: { type: Number, default: 0 },
    subscriptionFrequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    currentPeriod: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'CLOSED', 'SUSPENDED'], default: 'ACTIVE' },
    organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
}, { timestamps: true });

ChitGroupSchema.index({ organisationId: 1, status: 1 });

export default mongoose.models.ChitGroup || mongoose.model<IChitGroup>('ChitGroup', ChitGroupSchema);
