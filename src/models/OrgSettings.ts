import mongoose, { Schema, Document } from 'mongoose';

export interface IOrgSettings extends Document {
    organisationId: mongoose.Types.ObjectId;

    // ── Member Enrollment ──────────────────────────────────────────
    allowFractionalUnits: boolean;       // allow 0.5, 1.5 etc.
    maxUnitsPerMember: number;           // 0 = unlimited
    defaultUnitsPerMember: number;

    // ── Winner Selection ───────────────────────────────────────────
    allowMultipleWinnersPerPeriod: boolean;
    allowRepeatWinners: boolean;
    winnerSelectionMode: 'MANUAL' | 'LOTTERY' | 'AUCTION';

    // ── Collections & Payments ─────────────────────────────────────
    allowAdvancePayment: boolean;        // pay future periods
    allowPartialPayment: boolean;        // pay less than due amount
    gracePeriodDays: number;             // days after period before flagged overdue

    // ── Commission ─────────────────────────────────────────────────
    commissionType: 'FIXED' | 'PERCENTAGE';
    defaultCommissionRate: number;       // used when commissionType=PERCENTAGE (% of pot)

    // ── Group Creation Defaults ────────────────────────────────────
    defaultFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    defaultAllowCustomCollectionPattern: boolean;

    // ── Notifications ──────────────────────────────────────────────
    sendPaymentReminders: boolean;
    reminderDaysBefore: number;
    sendOverdueAlerts: boolean;
    sendWinnerAnnouncements: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const OrgSettingsSchema = new Schema<IOrgSettings>(
    {
        organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true, unique: true },

        // Member Enrollment
        allowFractionalUnits: { type: Boolean, default: true },
        maxUnitsPerMember: { type: Number, default: 0, min: 0 },   // 0 = unlimited
        defaultUnitsPerMember: { type: Number, default: 1, min: 0.5 },

        // Winner Selection
        allowMultipleWinnersPerPeriod: { type: Boolean, default: false },
        allowRepeatWinners: { type: Boolean, default: false },
        winnerSelectionMode: { type: String, enum: ['MANUAL', 'LOTTERY', 'AUCTION'], default: 'MANUAL' },

        // Collections & Payments
        allowAdvancePayment: { type: Boolean, default: false },
        allowPartialPayment: { type: Boolean, default: true },
        gracePeriodDays: { type: Number, default: 0, min: 0 },

        // Commission
        commissionType: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'FIXED' },
        defaultCommissionRate: { type: Number, default: 5, min: 0, max: 100 },

        // Group Creation Defaults
        defaultFrequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], default: 'WEEKLY' },
        defaultAllowCustomCollectionPattern: { type: Boolean, default: false },

        // Notifications
        sendPaymentReminders: { type: Boolean, default: true },
        reminderDaysBefore: { type: Number, default: 1, min: 0 },
        sendOverdueAlerts: { type: Boolean, default: true },
        sendWinnerAnnouncements: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.models.OrgSettings ||
    mongoose.model<IOrgSettings>('OrgSettings', OrgSettingsSchema);
