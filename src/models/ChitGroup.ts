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
    createdAt: Date;
    updatedAt: Date;
}

const ChitGroupSchema = new Schema<IChitGroup>({
    groupName: { type: String, required: true },
    description: { type: String },
    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], required: true },
    contributionAmount: { type: Number, required: true },
    totalUnits: { type: Number, required: true },
    totalPeriods: { type: Number, required: true },
    commissionValue: { type: Number, required: true },
    allowCustomCollectionPattern: { type: Boolean, default: false },
    subscriptionAmount: { type: Number, default: 0 },
    subscriptionFrequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    currentPeriod: { type: Number, default: 1 },
    status: { type: String, enum: ['ACTIVE', 'CLOSED', 'SUSPENDED'], default: 'ACTIVE' },
}, { timestamps: true });

export default mongoose.models.ChitGroup || mongoose.model<IChitGroup>('ChitGroup', ChitGroupSchema);
