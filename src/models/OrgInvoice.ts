import mongoose, { Schema, Document } from 'mongoose';

export interface IOrgInvoice extends Document {
    organisationId: mongoose.Types.ObjectId;
    subscriptionId: mongoose.Types.ObjectId;
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

// One invoice per org per billing month
OrgInvoiceSchema.index({ organisationId: 1, billingMonth: 1 }, { unique: true });

export default mongoose.models.OrgInvoice || mongoose.model<IOrgInvoice>('OrgInvoice', OrgInvoiceSchema);
