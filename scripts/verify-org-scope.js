
const BASE_URL = 'http://localhost:3000';

async function verifyOrgScope() {
    console.log('🚀 Starting Organisation Scope Verification...');

    // 1. Create Org A and Org B
    console.log('\n🏢 Creating Organisations...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin@123' })
    });
    
    if (!loginRes.ok) process.exit(1);
    const saCookie = loginRes.headers.get('set-cookie');
    const saHeaders = { 'Content-Type': 'application/json', 'Cookie': saCookie };

    const orgA_Res = await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST',
        headers: saHeaders,
        body: JSON.stringify({ name: "Org A", code: `OrgA-${Date.now()}` })
    });
    const orgA = await orgA_Res.json();

    const orgB_Res = await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST',
        headers: saHeaders,
        body: JSON.stringify({ name: "Org B", code: `OrgB-${Date.now()}` })
    });
    const orgB = await orgB_Res.json();
    console.log(`✅ Created Org A (${orgA._id}) and Org B (${orgB._id})`);

    // 2. Create Org Admin A (linked to Org A)
    console.log('\n👤 Creating Org Admin A...');
    const userARes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: saHeaders,
        body: JSON.stringify({
            name: "Admin A",
            email: `adminA.${Date.now()}@test.com`,
            password: "Password@123",
            role: "ORG_ADMIN",
            organisationId: orgA._id
        })
    });
    const userA = await userARes.json();

    // 3. Login as Org Admin A
    console.log('\n🔐 Logging in as Org Admin A...');
    const loginARes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userA.email, password: "Password@123" })
    });
    const cookieA = loginARes.headers.get('set-cookie');
    const headersA = { 'Content-Type': 'application/json', 'Cookie': cookieA };
    
    // 4. Create Group as Org Admin A
    console.log('\nUse Case: Org Admin creating group (Auto-Link)');
    const groupARes = await fetch(`${BASE_URL}/api/chitgroups`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            groupName: "Group A1",
            frequency: "MONTHLY",
            contributionAmount: 5000,
            totalUnits: 20,
            totalPeriods: 20,
            commissionValue: 2000,
            startDate: new Date().toISOString()
        })
    });
    
    if(groupARes.ok) {
        const groupA = await groupARes.json();
        console.log(`✅ Group A1 created by Org Admin A. ID: ${groupA._id}`);
        // Verify linkage
        if(groupA.organisationId === orgA._id) {
            console.log('✅ Verified: Group A1 linked to Org A');
        } else {
            console.error(`❌ Mismatch: Group Org ID ${groupA.organisationId} != User Org ID ${orgA._id}`);
        }
    } else {
        console.error('❌ Failed to create group as Org Admin:', await groupARes.text());
    }

    // 5. Verify Isolation: Org Admin A should only see Group A1
    console.log('\n🔍 Verifying Scope (GET /api/chitgroups)...');
    const listRes = await fetch(`${BASE_URL}/api/chitgroups`, { headers: headersA });
    const list = await listRes.json();
    if(Array.isArray(list) && list.length === 1 && list[0].organisationId === orgA._id) {
        console.log(`✅ Isolation Verified: Org Admin A sees exactly 1 group belonging to Org A.`);
    } else {
        console.error('❌ Isolation Failed:', list);
    }

    // 6. Super Admin creating group for Org B
    console.log('\nUse Case: Super Admin creating group for Org B');
    const groupBRes = await fetch(`${BASE_URL}/api/chitgroups`, {
        method: 'POST',
        headers: saHeaders,
        body: JSON.stringify({
            groupName: "Group B1 (By SA)",
            frequency: "MONTHLY",
            contributionAmount: 10000,
            totalUnits: 10,
            totalPeriods: 10,
            commissionValue: 5000,
            startDate: new Date().toISOString(),
            organisationId: orgB._id // EXPLICIT LINK
        })
    });
    
    if(groupBRes.ok) {
        const groupB = await groupBRes.json();
        console.log(`✅ Group B1 created by SA for Org B.`);
        if(groupB.organisationId === orgB._id) {
             console.log('✅ Verified: Group B1 linked to Org B');
        }
    } else {
        console.error('❌ Failed to create group as SA:', await groupBRes.text());
    }
    
    console.log('\n✨ Organisation Scope Verification Complete.');
}

verifyOrgScope().catch(console.error);
