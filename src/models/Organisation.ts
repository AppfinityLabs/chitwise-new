import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganisation extends Document {
    name: string;
    code: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
    panNumber?: string;
    logo?: string;
    status: 'ACTIVE' | 'INACTIVE';
    subscriptionPlan: 'BASIC' | 'PREMIUM' | 'TRIAL' | 'NONE';
    subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'NONE';
    trialEndsAt: Date | null;
    currentInvoiceStatus: 'PENDING' | 'PAID' | 'OVERDUE' | null;
    createdAt: Date;
    updatedAt: Date;
}

const OrganisationSchema = new Schema<IOrganisation>({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    gstNumber: { type: String },
    panNumber: { type: String },
    logo: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    subscriptionPlan: { type: String, enum: ['BASIC', 'PREMIUM', 'TRIAL', 'NONE'], default: 'NONE' },
    subscriptionStatus: { type: String, enum: ['TRIAL', 'ACTIVE', 'EXPIRED', 'NONE'], default: 'NONE' },
    trialEndsAt: { type: Date, default: null },
    currentInvoiceStatus: { type: String, enum: ['PENDING', 'PAID', 'OVERDUE', null], default: null },
}, { timestamps: true });

OrganisationSchema.index({ status: 1 });

export default mongoose.models.Organisation || mongoose.model<IOrganisation>('Organisation', OrganisationSchema);
