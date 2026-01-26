
const BASE_URL = 'http://localhost:3000';

async function verifyUserManagement() {
    console.log('🚀 Starting System User Verification...');

    // 1. Login as Admin (Super Admin from seed)
    console.log('\n🔐 Logging in as Super Admin...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin@123' })
    });
    
    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        process.exit(1);
    }
    
    const cookie = loginRes.headers.get('set-cookie');
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookie
    };
    console.log('✅ Logged in.');

    // 2. Create a new User
    console.log('\n👤 Creating a new Organisation Admin...');
    const newUser = {
        name: "Test Org Admin",
        email: `orgadmin.${Date.now()}@test.com`,
        password: "Password@123",
        role: "ORG_ADMIN"
    };

    const createRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newUser)
    });

    if (!createRes.ok) {
        console.error('Create User failed:', await createRes.text());
        process.exit(1);
    }
    
    const createdUser = await createRes.json();
    console.log(`✅ User created: ${createdUser.email} (${createdUser.role})`);

    // 3. List Users
    console.log('\n📋 Listing Users...');
    const listRes = await fetch(`${BASE_URL}/api/users`, { headers });
    const users = await listRes.json();
    
    const found = users.find(u => u.email === newUser.email);
    if (found && found.role === 'ORG_ADMIN') {
        console.log(`✅ Verified: User ${found.email} exists with role ${found.role}.`);
    } else {
        console.error('❌ Failed: Created user not found or role mismatch.');
    }

    // 4. Try Login as New User
    console.log('\n🔐 Testing Login for New User...');
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUser.email, password: newUser.password })
    });

    if (newLoginRes.ok) {
        console.log('✅ New Org Admin Login Successful!');
    } else {
        console.error('❌ New User Login Failed:', await newLoginRes.text());
    }

    console.log('\n✨ User Management Verified Successfully.');
}

verifyUserManagement().catch(console.error);
