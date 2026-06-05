import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
    phone: string;
    otp: string;
    provider: 'firebase' | 'msg91';
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
    phone: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    provider: { type: String, enum: ['firebase', 'msg91'], required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-delete expired OTPs after 10 minutes
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Otp || mongoose.model<IOtp>('Otp', OtpSchema);
