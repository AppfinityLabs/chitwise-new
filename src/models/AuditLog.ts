import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    actorId?: mongoose.Types.ObjectId;
    actorEmail?: string;
    actorRole?: string;
    organisationId?: mongoose.Types.ObjectId;
    action: string; // e.g. CREATE, UPDATE, DELETE
    entity: string; // e.g. Collection, Member, Winner, ChitGroup
    entityId?: string;
    summary?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorEmail: { type: String },
        actorRole: { type: String },
        organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation' },
        action: { type: String, required: true },
        entity: { type: String, required: true },
        entityId: { type: String },
        summary: { type: String },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ organisationId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
