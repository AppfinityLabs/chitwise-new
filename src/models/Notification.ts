import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    targetType: 'ALL' | 'ORGANISATION' | 'USER';
    targetId?: mongoose.Types.ObjectId; // organisationId or userId
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
    scheduledAt?: Date;
    sentAt?: Date;
    successCount: number;
    failCount: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    title: { type: String, required: true, maxlength: 100 },
    body: { type: String, required: true, maxlength: 500 },
    url: { type: String },
    icon: { type: String },
    targetType: {
        type: String,
        enum: ['ALL', 'ORGANISATION', 'USER'],
        default: 'ALL'
    },
    targetId: {
        type: Schema.Types.ObjectId,
        // Reference can be Organisation or User depending on targetType
    },
    status: {
        type: String,
        enum: ['DRAFT', 'SCHEDULED', 'SENT', 'FAILED'],
        default: 'DRAFT'
    },
    scheduledAt: Date,
    sentAt: Date,
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for query performance
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ createdBy: 1 });
NotificationSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', NotificationSchema);
