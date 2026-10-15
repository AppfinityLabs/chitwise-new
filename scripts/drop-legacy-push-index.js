// One-off: drop the legacy non-partial unique index on pushsubscriptions.subscription.endpoint.
// It makes every second mobile (FCM) subscription fail with E11000 (endpoint: null).
// The correct partial index "subscription.endpoint_unique_partial" (see src/models/PushSubscription.ts) stays.
// Usage: node --env-file=.env.local scripts/drop-legacy-push-index.js
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const c = mongoose.connection.db.collection('pushsubscriptions');
    const names = (await c.indexes()).map((i) => i.name);
    if (!names.includes('subscription.endpoint_1')) {
        console.log('Legacy index already gone. Nothing to do.');
        return;
    }
    if (!names.includes('subscription.endpoint_unique_partial')) {
        throw new Error('Replacement partial index missing; not dropping');
    }
    await c.dropIndex('subscription.endpoint_1');
    console.log('Dropped subscription.endpoint_1');
})()
    .catch((e) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
