// Set a new password for an admin user (prompted, not echoed).
// Usage: node --env-file=.env.local scripts/set-user-password.js <email>
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

function promptHidden(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl._writeToOutput = (s) => { if (s.startsWith(question)) rl.output.write(s); };
        rl.question(question, (answer) => { rl.output.write('\n'); rl.close(); resolve(answer); });
    });
}

async function main() {
    const email = process.argv[2];
    if (!email) throw new Error('Usage: node --env-file=.env.local scripts/set-user-password.js <email>');
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set (run with --env-file=.env.local)');

    await mongoose.connect(process.env.MONGODB_URI);
    const users = mongoose.connection.db.collection('users');
    const user = await users.findOne({ email: email.toLowerCase() }, { projection: { name: 1, role: 1 } });
    if (!user) throw new Error(`No user with email ${email}`);
    console.log(`User: ${user.name} (${user.role})`);

    const password = await promptHidden('New password (min 8 chars): ');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (password !== await promptHidden('Repeat password: ')) throw new Error('Passwords do not match');

    // Same hashing as src/lib/auth.ts hashPassword()
    const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    await users.updateOne({ _id: user._id }, { $set: { password: hash, updatedAt: new Date() } });
    console.log('Password updated.');
}

main()
    .catch((e) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
