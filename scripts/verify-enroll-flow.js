
const BASE_URL = 'http://localhost:3000';

async function verifyMemberEnrollFlow() {
    console.log('🚀 Starting Member+Enrollment Flow Verification...');

    // 1. Setup (Org + Admin + Group)
    console.log('\n[1] Setup...');
    // Login SA
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST', body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin@123' }),
        headers: { 'Content-Type': 'application/json' }
    });
    if(!loginRes.ok) process.exit(1);
    const saHeaders = { 'Content-Type': 'application/json', 'Cookie': loginRes.headers.get('set-cookie') };

    // Create Org
    const org = await (await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST', headers: saHeaders,
        body: JSON.stringify({ name: "Enroll Test Org", code: `ETO-${Date.now()}` })
    })).json();

    // Create Admin
    const admin = await (await fetch(`${BASE_URL}/api/users`, {
        method: 'POST', headers: saHeaders,
        body: JSON.stringify({ name: "Enroll Admin", email: `enroll.${Date.now()}@test.com`, password: "123", role: "ORG_ADMIN", organisationId: org._id })
    })).json();

    // Login Admin
    const loginAdmin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST', body: JSON.stringify({ email: admin.email, password: "123" }),
        headers: { 'Content-Type': 'application/json' }
    });
    const headers = { 'Content-Type': 'application/json', 'Cookie': loginAdmin.headers.get('set-cookie') };

    // Create Group
    const group = await (await fetch(`${BASE_URL}/api/chitgroups`, {
        method: 'POST', headers,
        body: JSON.stringify({ groupName: "Enroll Group", frequency: "MONTHLY", contributionAmount: 1000, totalUnits: 10, totalPeriods: 10, commissionValue: 500, startDate: new Date().toISOString() })
    })).json();
    console.log(`✅ Setup Complete. Org: ${org._id}, Group: ${group._id}`);

    // 2. Simulate Frontend Flow: Create Member -> Enroll
    console.log('\n[2] Simulating "Add Member & Enroll" Flow...');
    
    // A. Create Member
    console.log('   > POST /api/members...');
    const memberRes = await fetch(`${BASE_URL}/api/members`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: "Enrolled Guy", phone: "9998887776", organisationId: org._id }) // OrgId optional for OrgAdmin but good practice
    });
    const member = await memberRes.json();
    console.log(`     Created Member: ${member._id}`);

    // B. Enroll
    console.log('   > POST /api/groupmembers (Chained)...');
    const enrollRes = await fetch(`${BASE_URL}/api/groupmembers`, {
        method: 'POST', headers,
        body: JSON.stringify({
            memberId: member._id,
            groupId: group._id,
            units: 2,
            collectionPattern: "MONTHLY",
            joinDate: new Date().toISOString()
        })
    });
    
    if (enrollRes.ok) {
        const sub = await enrollRes.json();
        console.log(`     ✅ Enrolled Successfully! Subscription ID: ${sub._id}`);
        if(sub.pendingAmount === 20000) { // 1000 * 10 * 2
             console.log('     ✅ Calculations Correct (TotalDue: 20000)');
        }
    } else {
        console.error('     ❌ Enrollment Failed:', await enrollRes.text());
    }

    console.log('\n✨ Flow Verification Complete.');
}

verifyMemberEnrollFlow().catch(console.error);
