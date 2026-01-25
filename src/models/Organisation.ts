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
}, { timestamps: true });

export default mongoose.models.Organisation || mongoose.model<IOrganisation>('Organisation', OrganisationSchema);
