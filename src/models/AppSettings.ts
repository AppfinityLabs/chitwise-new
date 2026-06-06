import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSettings extends Document {
    key: string; // singleton key, always 'GLOBAL'
    // Notification channels
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    notificationFromName?: string;
    notificationReplyTo?: string;
    // System preferences
    currency: string; // ISO code e.g. INR, USD
    currencySymbol: string; // e.g. ₹, $
    dateFormat: string; // e.g. DD/MM/YYYY
    language: string; // e.g. en, ml
    timezone: string; // e.g. Asia/Kolkata
    createdAt: Date;
    updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
    {
        key: { type: String, required: true, unique: true, default: 'GLOBAL' },
        emailEnabled: { type: Boolean, default: false },
        smsEnabled: { type: Boolean, default: false },
        pushEnabled: { type: Boolean, default: true },
        notificationFromName: { type: String, default: 'ChitWise' },
        notificationReplyTo: { type: String, default: '' },
        currency: { type: String, default: 'INR' },
        currencySymbol: { type: String, default: '₹' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'Asia/Kolkata' },
    },
    { timestamps: true }
);

export default mongoose.models.AppSettings ||
    mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
