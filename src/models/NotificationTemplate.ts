import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationTemplate extends Document {
    name: string;
    title: string;
    body: string;
    image?: string;
    url?: string;
    priority: 'normal' | 'urgent';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>({
    name: { type: String, required: true, unique: true, maxlength: 50 },
    title: { type: String, required: true, maxlength: 100 },
    body: { type: String, required: true, maxlength: 500 },
    image: { type: String },
    url: { type: String },
    priority: {
        type: String,
        enum: ['normal', 'urgent'],
        default: 'normal'
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.models.NotificationTemplate ||
    mongoose.model<INotificationTemplate>('NotificationTemplate', NotificationTemplateSchema);
