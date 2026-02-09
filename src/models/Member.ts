import mongoose, { Schema, Document } from 'mongoose';
import '@/models/Organisation';

export interface IMember extends Document {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    pin?: string;
    status: 'ACTIVE' | 'INACTIVE';
    kycVerified: boolean;
    organisationId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MemberSchema = new Schema<IMember>({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    address: { type: String },
    pin: { type: String }, // 4-digit PIN, stored as bcrypt hash
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    kycVerified: { type: Boolean, default: false },
    organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
}, { timestamps: true });

export default mongoose.models.Member || mongoose.model<IMember>('Member', MemberSchema);
