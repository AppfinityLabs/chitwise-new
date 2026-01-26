
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://adhil1akbar:BobaMetals123@cluster0.k5mfwdc.mongodb.net/chitwise-appfinity?retryWrites=true&w=majority';

async function seedSuperAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@123', salt);
        
        // Define minimal User schema to insert
        const UserSchema = new mongoose.Schema({ name: String, email: String, password: String, role: String, status: String }, { strict: false });
        const User = mongoose.model('User', UserSchema);

        await User.create({
            name: 'Super Admin',
            email: 'admin@gmail.com',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        });

        console.log('✅ Super Admin seeded (admin@gmail.com / Admin@123)');
    } catch (err) {
        console.error('Seed Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

seedSuperAdmin();
