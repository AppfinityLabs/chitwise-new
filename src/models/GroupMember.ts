import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMember extends Document {
    memberId: mongoose.Schema.Types.ObjectId;
    groupId: mongoose.Schema.Types.ObjectId;
    units: number;
    collectionPattern: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    collectionFactor: number;
    joinDate: Date;
    totalDue: number;
    totalCollected: number;
    pendingAmount: number;
    status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
    createdAt: Date;
    updatedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>({
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', required: true },
    units: { type: Number, required: true }, // e.g., 0.5, 1, 2
    collectionPattern: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], required: true },
    collectionFactor: { type: Number, required: true }, // Derived
    joinDate: { type: Date, default: Date.now },
    totalDue: { type: Number, required: true }, // Calculated initially
    totalCollected: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'CLOSED', 'DEFAULTED'], default: 'ACTIVE' },
}, { timestamps: true });

export default mongoose.models.GroupMember || mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);
