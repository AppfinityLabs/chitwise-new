import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import OrgSubscription from '@/models/OrgSubscription';
import '@/models/Organisation'; // Required for populate
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateCurrentPeriod } from '@/lib/utils';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const organisationId = searchParams.get('organisationId');

    let query: any = {};

    // Org Admin: Enforce Own Org
    if (user.role === 'ORG_ADMIN' && user.organisationId) {
        query.organisationId = user.organisationId;
    }
    // Super Admin: Allow Filter
    else if (organisationId) {
        query.organisationId = organisationId;
    }

    try {
        const groups = await ChitGroup.find(query)
            .sort({ createdAt: -1 })
            .populate('organisationId', 'name code');

        // Dynamically calculate currentPeriod for each group
        const groupsWithPeriod = groups.map(g => {
            const obj = g.toObject();
            obj.currentPeriod = calculateCurrentPeriod(g);
            return obj;
        });

        return withCors(NextResponse.json(groupsWithPeriod), origin);
    } catch (error: any) {
        console.error('Error fetching groups:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch groups', details: error.message }, { status: 500 }), origin);
    }
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

        // Scope to Organisation
        if (user.role === 'ORG_ADMIN') {
            if (!user.organisationId) {
                return withCors(NextResponse.json({ error: 'User not linked to an organisation' }, { status: 400 }), origin);
            }
            body.organisationId = user.organisationId;
        } else if (user.role === 'SUPER_ADMIN') {
            if (!body.organisationId) {
                return withCors(NextResponse.json({ error: 'Organisation ID is required for Super Admin' }, { status: 400 }), origin);
            }
        }

        // Check group limit for Basic plan
        const orgId = body.organisationId;
        const subscription = await OrgSubscription.findOne({ organisationId: orgId });
        if (subscription && subscription.planName === 'BASIC' && subscription.maxGroups) {
            const activeGroupCount = await ChitGroup.countDocuments({ organisationId: orgId, status: 'ACTIVE' });
            if (activeGroupCount >= subscription.maxGroups) {
                return withCors(NextResponse.json({
                    error: `Basic plan allows a maximum of ${subscription.maxGroups} active groups. Please upgrade to Premium for unlimited groups.`,
                    limitReached: true,
                    currentCount: activeGroupCount,
                    maxGroups: subscription.maxGroups,
                }, { status: 403 }), origin);
            }
        }

        const group = await ChitGroup.create(body);
        return withCors(NextResponse.json(group, { status: 201 }), origin);
    } catch (error: any) {
        return withCors(NextResponse.json({ error: 'Failed to create group', details: error.message }, { status: 400 }), origin);
    }
}
