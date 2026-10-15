
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Run with: node --env-file=.env.local <script>');
  process.exit(1);
}

async function clearDatabase() {
    console.log('🗑️  Clearing Database...');
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const collections = await mongoose.connection.db.collections();
        
        for (const collection of collections) {
            await collection.deleteMany({});
            console.log(`   - Cleared: ${collection.collectionName}`);
        }

        console.log('✨ All collections cleared successfully.');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

// Check if running directly
if (require.main === module) {
    clearDatabase();
}
