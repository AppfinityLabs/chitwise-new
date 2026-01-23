import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    status: 'ACTIVE' | 'INACTIVE';
    kycVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MemberSchema = new Schema<IMember>({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    address: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    kycVerified: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Member || mongoose.model<IMember>('Member', MemberSchema);
