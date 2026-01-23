import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
    groupMemberId: mongoose.Schema.Types.ObjectId;
    groupId: mongoose.Schema.Types.ObjectId;
    memberId: mongoose.Schema.Types.ObjectId;
    basePeriodNumber: number;
    collectionSequence: number;
    periodDate: Date;
    amountDue: number;
    amountPaid: number;
    paymentMode: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
    collectedBy?: mongoose.Schema.Types.ObjectId;
    collectedAt: Date;
    remarks?: string;
    status: 'PENDING' | 'PAID' | 'PARTIAL' | 'FAILED';
    createdAt: Date;
    updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>({
    groupMemberId: { type: Schema.Types.ObjectId, ref: 'GroupMember', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    basePeriodNumber: { type: Number, required: true },
    collectionSequence: { type: Number, default: 1 },
    periodDate: { type: Date, required: true },
    amountDue: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'], default: 'CASH' },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    collectedAt: { type: Date, default: Date.now },
    remarks: { type: String },
    status: { type: String, enum: ['PENDING', 'PAID', 'PARTIAL', 'FAILED'], default: 'PAID' },
}, { timestamps: true });

// Prevent duplicate collection for same sequence
CollectionSchema.index({ groupMemberId: 1, basePeriodNumber: 1, collectionSequence: 1 }, { unique: true });

export default mongoose.models.Collection || mongoose.model<ICollection>('Collection', CollectionSchema);
