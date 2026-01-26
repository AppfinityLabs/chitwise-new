
const BASE_URL = 'http://localhost:3000';

async function verifyOrgLinking() {
    console.log('🚀 Starting Organisation Linking Verification...');

    // 1. Login as Super Admin
    console.log('\n🔐 Logging in as Super Admin...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin@123' })
    });
    
    if (!loginRes.ok) {
        console.error('Login failed');
        process.exit(1);
    }
    
    const cookie = loginRes.headers.get('set-cookie');
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookie
    };

    // 2. Create a Dummy Organisation
    console.log('\n🏢 Creating Dummy Organisation...');
    const orgRes = await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "Tech Corp",
            code: `TC-${Date.now()}`
        })
    });
    
    if(!orgRes.ok) {
        console.error('Failed to create organisation:', await orgRes.text());
        process.exit(1);
    }
    const org = await orgRes.json();
    console.log(`✅ Organisation Created: ${org.name} (${org._id})`);

    // 3. Create Org Admin LINKED to this Org
    console.log('\n👤 Creating Org Admin linked to Tech Corp...');
    const userRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "Org Manager",
            email: `manager.${Date.now()}@test.com`,
            password: "Password@123",
            role: "ORG_ADMIN",
            organisationId: org._id
        })
    });

    if(!userRes.ok) {
        console.error('Failed to create linked user:', await userRes.text());
        process.exit(1);
    }
    
    const user = await userRes.json();
    console.log(`✅ User Created: ${user.name} (${user.email})`);

    // 4. Verify Linkage via GET
    console.log('\n🔍 Verifying Linkage...');
    const getRes = await fetch(`${BASE_URL}/api/users/${user._id}`, { headers });
    const userDetail = await getRes.json();
    
    if(userDetail.organisationId === org._id) {
        console.log(`✅ Verified: User is linked to organisation ID ${userDetail.organisationId}`);
    } else {
        console.error(`❌ Failed: Linkage mismatch. Got ${userDetail.organisationId}, expected ${org._id}`);
    }

    // 5. Test Validation (Try to create Org Admin WITHOUT Org)
    console.log('\n🛡️ Testing Validation (Missing Org)...');
    const failRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "I Should Fail",
            email: `fail.${Date.now()}@test.com`,
            password: "Password@123",
            role: "ORG_ADMIN"
            // organisationId MISSING
        })
    });

    if(failRes.status === 400) {
        console.log('✅ Validation Passed: Server rejected Org Admin without Organisation');
    } else {
        console.error(`❌ Validation Failed: Server returned ${failRes.status}`);
    }

    // Cleanup
    await fetch(`${BASE_URL}/api/users/${user._id}`, { method: 'DELETE', headers });
    
    console.log('\n✨ Org Linking Verification Complete.');
}

verifyOrgLinking().catch(console.error);
