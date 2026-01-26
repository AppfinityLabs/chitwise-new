
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://adhil1akbar:BobaMetals123@cluster0.k5mfwdc.mongodb.net/chitwise-appfinity?retryWrites=true&w=majority';

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
