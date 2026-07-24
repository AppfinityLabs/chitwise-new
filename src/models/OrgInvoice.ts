import mongoose, { Schema, Document } from 'mongoose';

export interface IOrgInvoice extends Document {
    organisationId: mongoose.Types.ObjectId;
    subscriptionId: mongoose.Types.ObjectId;
    groupId: mongoose.Types.ObjectId | null; // null = legacy org-wide invoice
    groupName: string | null;
    billingMonth: Date; // 1st of the month
    activeGroupCount: number;
    pricePerGroup: number;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
    dueDate: Date;
    graceEndDate: Date; // dueDate + 3 days
    paidAt: Date | null;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    razorpaySignature: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const OrgInvoiceSchema = new Schema<IOrgInvoice>({
    organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'OrgSubscription', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'ChitGroup', default: null },
    groupName: { type: String, default: null },
    billingMonth: { type: Date, required: true },
    activeGroupCount: { type: Number, required: true },
    pricePerGroup: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'OVERDUE', 'WAIVED'], default: 'PENDING' },
    dueDate: { type: Date, required: true },
    graceEndDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
}, { timestamps: true });

// One invoice per group per billing month.
// Legacy org-wide rows carry groupId: null and stay unique per org per month.
OrgInvoiceSchema.index({ organisationId: 1, groupId: 1, billingMonth: 1 }, { unique: true });

export default mongoose.models.OrgInvoice || mongoose.model<IOrgInvoice>('OrgInvoice', OrgInvoiceSchema);
