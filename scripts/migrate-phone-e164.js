/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const apply = process.argv.includes('--apply');

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const organisations = await db.collection('organisations').find({}).toArray();
    const orgById = new Map(
        organisations.map((org) => [
            String(org._id),
            String(org.defaultCountry || 'IN').toUpperCase(),
        ]),
    );

    const members = await db.collection('members').find({
        $or: [
            { phoneE164: { $exists: false } },
            { phoneE164: null },
            { phoneE164: '' },
        ],
    }).toArray();

    const changes = [];
    const invalid = [];
    for (const member of members) {
        const country = orgById.get(String(member.organisationId)) || 'IN';
        const parsed = parsePhoneNumberFromString(String(member.phone || ''), country);
        if (!parsed?.isValid()) {
            invalid.push({
                memberId: String(member._id),
                organisationId: String(member.organisationId),
                phone: member.phone,
                assumedCountry: country,
            });
            continue;
        }
        changes.push({
            memberId: String(member._id),
            from: member.phone,
            to: parsed.number,
            country: parsed.country || country,
            nationalNumber: parsed.nationalNumber,
        });
    }

    console.log(JSON.stringify({
        mode: apply ? 'APPLY' : 'DRY_RUN',
        scanned: members.length,
        ready: changes.length,
        invalid: invalid.length,
        invalidRecords: invalid,
    }, null, 2));

    if (apply) {
        for (const organisation of organisations) {
            const country = String(organisation.defaultCountry || 'IN').toUpperCase();
            const defaults = {
                defaultCountry: country,
                allowedCountries: organisation.allowedCountries?.length
                    ? organisation.allowedCountries
                    : [country],
                currencyCode: organisation.currencyCode || (country === 'BH' ? 'BHD' : 'INR'),
                locale: organisation.locale || (country === 'BH' ? 'en-BH' : 'en-IN'),
                timezone: organisation.timezone || (country === 'BH' ? 'Asia/Bahrain' : 'Asia/Kolkata'),
            };
            await db.collection('organisations').updateOne(
                { _id: organisation._id },
                { $set: defaults },
            );
        }
        for (const change of changes) {
            await db.collection('members').updateOne(
                { _id: new mongoose.Types.ObjectId(change.memberId) },
                {
                    $set: {
                        phone: change.to,
                        phoneE164: change.to,
                        phoneCountry: change.country,
                        phoneNational: change.nationalNumber,
                    },
                },
            );
        }
        await db.collection('members').createIndex(
            { phoneE164: 1 },
            {
                unique: true,
                name: 'unique_customer_phone_e164',
                partialFilterExpression: { phoneE164: { $type: 'string' } },
            },
        );
        console.log(`Updated ${changes.length} member records and ${organisations.length} organisation defaults.`);
    } else {
        console.log('No records changed. Re-run with --apply after reviewing invalidRecords.');
    }

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
