import mongoose, { Schema, Document } from 'mongoose';

export interface IWinner extends Document {
    groupId: mongoose.Schema.Types.ObjectId;
    groupMemberId: mongoose.Schema.Types.ObjectId;
    memberId: mongoose.Schema.Types.ObjectId;
    basePeriodNumber: number;
    winningUnits: number;
    prizeAmount: number;
    selectionMethod: 'LOTTERY' | 'AUCTION';
    commissionEarned: number;
    payoutDate?: Date;
    status: 'PENDING' | 'PAID' | 'FORFEITED';
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WinnerSchema = new Schema<IWinner>({
    groupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    groupMemberId: { type: Schema.Types.ObjectId, ref: 'GroupMember', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    basePeriodNumber: { type: Number, required: true },
    winningUnits: { type: Number, required: true },
    prizeAmount: { type: Number, required: true },
    selectionMethod: { type: String, enum: ['LOTTERY', 'AUCTION'], default: 'LOTTERY' },
    commissionEarned: { type: Number, required: true },
    payoutDate: { type: Date },
    status: { type: String, enum: ['PENDING', 'PAID', 'FORFEITED'], default: 'PENDING' },
    remarks: { type: String },
}, { timestamps: true });

// Prevent duplicate winners for the same group and period
WinnerSchema.index({ groupId: 1, basePeriodNumber: 1 }, { unique: true });

export default mongoose.models.Winner || mongoose.model<IWinner>('Winner', WinnerSchema);
