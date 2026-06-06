import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member'; // Ensure model is registered
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { notifyEnrollment } from '@/lib/eventNotifications';
import { logAudit } from '@/lib/audit';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

function resolveCollectionFactor(baseFreq: string, pattern: string): number {
    if (baseFreq === 'MONTHLY') {
        if (pattern === 'DAILY') return 30;
        if (pattern === 'WEEKLY') return 4;
        return 1;
    }
    if (baseFreq === 'WEEKLY') {
        if (pattern === 'DAILY') return 7;
        return 1;
    }
    return 1; // DAILY base
}

interface BulkRow {
    memberId: string;
    units?: number;
    collectionPattern?: string;
    joinDate?: string;
}

interface RowResult {
    memberId: string;
    success: boolean;
    error?: string;
    subscriptionId?: string;
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    try {
        const body = await request.json();
        const { groupId, members } = body as { groupId: string; members: BulkRow[] };

        if (!groupId || !Array.isArray(members) || members.length === 0) {
            return withCors(NextResponse.json({ error: 'groupId and a non-empty members array are required' }, { status: 400 }), origin);
        }

        // Fetch group and enforce org scoping
        const group = await ChitGroup.findById(groupId);
        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }
        if (user.role === 'ORG_ADMIN' && group.organisationId?.toString() !== user.organisationId) {
            return withCors(NextResponse.json({ error: 'Group does not belong to your organisation' }, { status: 403 }), origin);
        }

        // Current allocated units across active subscriptions
        const existingSubscriptions = await GroupMember.find({ groupId, status: 'ACTIVE' });
        let allocatedUnits = existingSubscriptions.reduce((sum: number, sub: any) => sum + sub.units, 0);
        const alreadyEnrolledIds = new Set(existingSubscriptions.map((s: any) => s.memberId.toString()));

        const results: RowResult[] = [];

        for (const row of members) {
            const memberId = row.memberId;
            const units = row.units && row.units > 0 ? row.units : 1;
            const collectionPattern = row.collectionPattern || group.frequency;

            try {
                if (!memberId) throw new Error('memberId is required');

                if (alreadyEnrolledIds.has(memberId.toString())) {
                    throw new Error('Member already enrolled in this group');
                }

                // Capacity check against remaining units
                if (allocatedUnits + units > group.totalUnits) {
                    const available = group.totalUnits - allocatedUnits;
                    throw new Error(`Only ${available} unit(s) available out of ${group.totalUnits}`);
                }

                // Enforce custom collection pattern rules
                if (!group.allowCustomCollectionPattern && collectionPattern !== group.frequency) {
                    throw new Error(`Collection pattern must be ${group.frequency}`);
                }

                const totalDue = group.contributionAmount * group.totalPeriods * units;
                const collectionFactor = resolveCollectionFactor(group.frequency, collectionPattern);

                const subscription = await GroupMember.create({
                    groupId,
                    memberId,
                    units,
                    collectionPattern,
                    collectionFactor,
                    joinDate: row.joinDate || new Date(),
                    totalDue,
                    totalCollected: 0,
                    pendingAmount: totalDue,
                    status: 'ACTIVE',
                });

                allocatedUnits += units;
                alreadyEnrolledIds.add(memberId.toString());

                notifyEnrollment({
                    memberId: memberId.toString(),
                    groupName: group.groupName,
                    groupId: groupId.toString(),
                    units,
                    totalDue,
                }).catch(() => {});

                results.push({ memberId, success: true, subscriptionId: String(subscription._id) });
            } catch (err: any) {
                results.push({ memberId, success: false, error: err.message || 'Failed to enroll' });
            }
        }

        const enrolled = results.filter(r => r.success).length;
        const failed = results.length - enrolled;

        await logAudit(user, {
            action: 'CREATE',
            entity: 'GroupMember',
            entityId: groupId,
            summary: `Bulk enrolled ${enrolled} member(s) into ${group.groupName}${failed ? `, ${failed} failed` : ''}`,
            metadata: { groupId, enrolled, failed },
        });

        return withCors(NextResponse.json({ enrolled, failed, results }, { status: failed && !enrolled ? 400 : 201 }), origin);
    } catch (error: any) {
        console.error(error);
        return withCors(NextResponse.json({ error: 'Failed to process bulk enrollment', details: error.message }, { status: 400 }), origin);
    }
}
