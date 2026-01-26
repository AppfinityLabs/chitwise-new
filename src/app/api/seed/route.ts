import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import Winner from '@/models/Winner';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST() {
    await dbConnect();

    try {
        // Cleanup (optional, be careful in prod)
        await Collection.deleteMany({});
        await GroupMember.deleteMany({});
        await ChitGroup.deleteMany({});
        await Member.deleteMany({});
        await User.deleteMany({});

        // Create Super Admin User
        const hashedPassword = await hashPassword('Admin@123');
        await User.create({
            email: 'admin@gmail.com',
            password: hashedPassword,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        });

        console.log('✅ Super Admin created: admin@gmail.com / Admin@123');

        // --- Case 1: 52-Week Chit ---
        const group1 = await ChitGroup.create({
            groupName: "52W-2000-2026",
            frequency: "WEEKLY",
            contributionAmount: 2000,
            totalUnits: 52,
            totalPeriods: 52,
            commissionValue: 4000,
            startDate: new Date("2026-01-10")
        });

        const memberRavi = await Member.create({ name: "Ravi", phone: "9876543210" });

        // Ravi joins Group 1
        const sub1 = await GroupMember.create({
            groupId: group1._id,
            memberId: memberRavi._id,
            units: 1.0,
            collectionPattern: "WEEKLY",
            collectionFactor: 1, // Weekly group, Weekly pattern -> 1
            totalDue: 2000 * 52 * 1,
            joinDate: new Date("2026-01-10")
        });

        // --- Case 2: 220-Day Chit ---
        const group2 = await ChitGroup.create({
            groupName: "220D-500-2026",
            frequency: "DAILY",
            contributionAmount: 500,
            totalUnits: 220,
            totalPeriods: 220,
            commissionValue: 10000,
            startDate: new Date("2026-01-10")
        });

        const memberAnil = await Member.create({ name: "Anil", phone: "9876543211" });

        // Anil joins Group 2 (0.5 unit)
        const sub2 = await GroupMember.create({
            groupId: group2._id,
            memberId: memberAnil._id,
            units: 0.5,
            collectionPattern: "DAILY",
            collectionFactor: 1,
            totalDue: 500 * 220 * 0.5,
            joinDate: new Date("2026-01-10")
        });

        // --- Case 3: Monthly Mixed ---
        const group3 = await ChitGroup.create({
            groupName: "20M-3000-2026",
            frequency: "MONTHLY",
            contributionAmount: 3000,
            totalUnits: 20,
            totalPeriods: 20,
            commissionValue: 2000,
            allowCustomCollectionPattern: true,
            startDate: new Date("2026-01-10")
        });

        const memberDeepa = await Member.create({ name: "Deepa", phone: "9876543212" });

        // Ravi in Group 3 (Monthly)
        await GroupMember.create({
            groupId: group3._id,
            memberId: memberRavi._id,
            units: 1.0,
            collectionPattern: "MONTHLY",
            collectionFactor: 1,
            totalDue: 3000 * 20,
            joinDate: new Date("2026-01-10")
        });

        // Anil in Group 3 (Weekly)
        await GroupMember.create({
            groupId: group3._id,
            memberId: memberAnil._id,
            units: 1.0,
            collectionPattern: "WEEKLY",
            collectionFactor: 4,
            totalDue: 3000 * 20,
            joinDate: new Date("2026-01-10")
        });

        // Deepa in Group 3 (Daily)
        await GroupMember.create({
            groupId: group3._id,
            memberId: memberDeepa._id,
            units: 0.5,
            collectionPattern: "DAILY",
            collectionFactor: 30,
            totalDue: 3000 * 20 * 0.5,
            joinDate: new Date("2026-01-10")
        });

        // --- Case 4: Double Chit (Rajesh) ---
        // Rajesh joins Group 1 (which is 52W-2000-2026 created above)
        const memberRajesh = await Member.create({ name: "Rajesh", phone: "9876543213" });
        await GroupMember.create({
            groupId: group1._id,
            memberId: memberRajesh._id,
            units: 2.0,
            collectionPattern: "WEEKLY",
            collectionFactor: 1,
            totalDue: 2000 * 52 * 2,
            joinDate: new Date("2026-01-10")
        });

        return NextResponse.json({ message: "Seed data created successfully", groups: [group1, group2, group3] });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Seed failed", details: error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await Collection.deleteMany({}, { session });
        await GroupMember.deleteMany({}, { session });
        await Winner.deleteMany({}, { session });
        await ChitGroup.deleteMany({}, { session });
        await Member.deleteMany({}, { session });

        await session.commitTransaction();
        session.endSession();

        return NextResponse.json({ message: 'Database cleared successfully' });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
