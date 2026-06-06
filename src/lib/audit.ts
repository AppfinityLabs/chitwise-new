import AuditLog from '@/models/AuditLog';
import type { JWTPayload } from '@/lib/auth';

export interface AuditOptions {
    action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
    entity: string;
    entityId?: string;
    summary?: string;
    metadata?: Record<string, any>;
}

/**
 * Fire-and-forget audit logger. Records who did what to which entity.
 * Never throws — auditing must not break the parent request.
 */
export async function logAudit(actor: JWTPayload | null | undefined, opts: AuditOptions): Promise<void> {
    try {
        await AuditLog.create({
            actorId: actor?.userId,
            actorEmail: actor?.email,
            actorRole: actor?.role,
            organisationId: actor?.organisationId,
            action: opts.action,
            entity: opts.entity,
            entityId: opts.entityId,
            summary: opts.summary,
            metadata: opts.metadata,
        });
    } catch (e) {
        console.error('Audit log failed:', e);
    }
}
