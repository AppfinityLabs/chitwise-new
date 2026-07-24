
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://adhil1akbar:BobaMetals123@cluster0.k5mfwdc.mongodb.net/chitwise-appfinity?retryWrites=true&w=majority';

const OLD_INDEX = 'organisationId_1_billingMonth_1';
const NEW_INDEX = 'organisationId_1_groupId_1_billingMonth_1';

/**
 * Cutover to per-group subscription billing.
 *
 * Existing org-wide invoices are left exactly as they are (groupId stays null) so
 * paid financial records are never rewritten. Only the unique index changes, so
 * that from now on one invoice can exist per group per billing month.
 *
 * Take a dump of the orginvoices collection before running — dropping an index
 * is not reversible in place.
 */
async function migrate() {
    console.log('📦 Migrating to per-group invoices...');
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const collection = mongoose.connection.db.collection('orginvoices');

        const legacyCount = await collection.countDocuments({ groupId: { $in: [null, undefined] } });
        console.log(`   - Legacy org-wide invoices kept as history: ${legacyCount}`);

        const indexes = await collection.indexes();

        if (indexes.some((i) => i.name === OLD_INDEX)) {
            await collection.dropIndex(OLD_INDEX);
            console.log(`   - Dropped index: ${OLD_INDEX}`);
        } else {
            console.log(`   - Index ${OLD_INDEX} not present, skipping drop`);
        }

        if (indexes.some((i) => i.name === NEW_INDEX)) {
            console.log(`   - Index ${NEW_INDEX} already exists, skipping create`);
        } else {
            await collection.createIndex(
                { organisationId: 1, groupId: 1, billingMonth: 1 },
                { unique: true, name: NEW_INDEX },
            );
            console.log(`   - Created index: ${NEW_INDEX}`);
        }

        console.log('✨ Migration complete. Per-group invoices generate from the next status/current-invoice call.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

migrate();
