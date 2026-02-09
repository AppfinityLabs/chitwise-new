const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Should match your .env.local or default
const MONGODB_URI = 'mongodb+srv://adhil1akbar:BobaMetals123@cluster0.k5mfwdc.mongodb.net/chitwise-appfinity?retryWrites=true&w=majority';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define minimal Schema to access data
    const MemberSchema = new mongoose.Schema({
        name: String,
        phone: String,
        pin: String,
        status: String
    });
    
    // Register model if not exists (handling potential overwrite)
    const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

    const members = await Member.find({});
    console.log(`Found ${members.length} members.`);

    for (const m of members) {
        console.log(`- ${m.name} (${m.phone}): PIN ${m.pin ? 'SET' : 'MISSING'} [${m.status}]`);
    }

    // You can hardcode a phone number here to set a PIN for a specific user
    // allow passing phone and pin as args
    const targetPhone = process.argv[2];
    const newPin = process.argv[3];

    if (targetPhone && newPin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(newPin, salt);
        
        const res = await Member.updateOne({ phone: targetPhone }, { pin: hashedPin });
        if (res.modifiedCount > 0) {
            console.log(`SUCCESS: Updated PIN for ${targetPhone}`);
        } else {
            console.log(`ERROR: Member with phone ${targetPhone} not found`);
        }
    } else {
        console.log('\nUsage: node scripts/set-pin.js <PHONE> <PIN>');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
