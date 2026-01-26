
const BASE_URL = 'http://localhost:3000';

async function verifyAllScope() {
    console.log('🚀 Starting Comprehensive Scope Verification...\n');

    // =========================================================================
    // 1. SETUP: Super Admin & Organisations
    // =========================================================================
    
    // Login SA
    console.log('🔑 Login Super Admin...');
    const saLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin@123' })
    });
    if (!saLogin.ok) { console.error('SA Login Failed'); process.exit(1); }
    const saCookie = saLogin.headers.get('set-cookie');
    const saHeaders = { 'Content-Type': 'application/json', 'Cookie': saCookie };

    // Create Org A & B
    console.log('🏢 Creating Org A and Org B...');
    const orgA = await (await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST', headers: saHeaders,
        body: JSON.stringify({ name: "Org A", code: "ORGA" })
    })).json();

    const orgB = await (await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST', headers: saHeaders,
        body: JSON.stringify({ name: "Org B", code: "ORGB" })
    })).json();
    console.log(`   > Org A: ${orgA._id}`);
    console.log(`   > Org B: ${orgB._id}`);

    // Create Admins
    console.log('👤 Creating Admins (A & B)...');
    const adminA = await (await fetch(`${BASE_URL}/api/users`, {
        method: 'POST', headers: saHeaders,
        body: JSON.stringify({ name: "Admin A", email: "a@test.com", password: "123", role: "ORG_ADMIN", organisationId: orgA._id })
    })).json();

    const adminB = await (await fetch(`${BASE_URL}/api/users`, {
        method: 'POST', headers: saHeaders,
        body: JSON.stringify({ name: "Admin B", email: "b@test.com", password: "123", role: "ORG_ADMIN", organisationId: orgB._id })
    })).json();

    // =========================================================================
    // 2. ORG A OPERATIONS
    // =========================================================================
    
    console.log('\n🔵 -- Switching to ORG A Context --');
    
    // Login Admin A
    const loginA = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "a@test.com", password: "123" })
    });
    const headersA = { 'Content-Type': 'application/json', 'Cookie': loginA.headers.get('set-cookie') };

    // 1. Create Group A1
    console.log('   Creating Group A1...');
    const groupA1 = await (await fetch(`${BASE_URL}/api/chitgroups`, {
        method: 'POST', headers: headersA,
        body: JSON.stringify({ groupName: "Group A1", frequency: "MONTHLY", contributionAmount: 5000, totalUnits: 10, totalPeriods: 10, commissionValue: 1000, startDate: new Date().toISOString() })
    })).json();
    
    // 2. Add Member M1
    console.log('   Adding Member M1...');
    const memberM1 = await (await fetch(`${BASE_URL}/api/members`, {
        method: 'POST', headers: headersA,
        body: JSON.stringify({ name: "Member M1", phone: "1111111111" })
    })).json();

    // 3. Enroll M1 in A1
    console.log('   Enrolling M1 in A1...');
    const subM1 = await (await fetch(`${BASE_URL}/api/groupmembers`, {
        method: 'POST', headers: headersA,
        body: JSON.stringify({ groupId: groupA1._id, memberId: memberM1._id, units: 1, collectionPattern: "MONTHLY" })
    })).json();

    // 4. Collect Payment
    console.log('   Recording Collection (5000)...');
    await fetch(`${BASE_URL}/api/collections`, {
        method: 'POST', headers: headersA,
        body: JSON.stringify({ groupMemberId: subM1._id, basePeriodNumber: 1, amountPaid: 5000, paymentMode: "CASH", periodDate: new Date().toISOString() })
    });

    // 5. Create Winner (for Reports/Winners check)
    // Need to collect enough? Winner creation doesn't enforce strict pot balance in current MVP API usually, but let's try.
    console.log('   Declaring Winner...');
    await fetch(`${BASE_URL}/api/winners`, {
        method: 'POST', headers: headersA,
        body: JSON.stringify({ groupId: groupA1._id, groupMemberId: subM1._id, memberId: memberM1._id, basePeriodNumber: 1, winningUnits: 1, prizeAmount: 45000 })
    });

    // =========================================================================
    // 3. ORG B OPERATIONS (Isolation Check)
    // =========================================================================
    
    console.log('\n🟠 -- Switching to ORG B Context --');
    
    // Login Admin B
    const loginB = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "b@test.com", password: "123" })
    });
    const headersB = { 'Content-Type': 'application/json', 'Cookie': loginB.headers.get('set-cookie') };

    // 1. Check Groups
    console.log('   Checking Groups (Should be 0)...');
    const groupsB = await (await fetch(`${BASE_URL}/api/chitgroups`, { headers: headersB })).json();
    if (groupsB.length === 0) console.log('   ✅ Groups Isolated');
    else console.error('   ❌ DATA LEAK: Saw groups:', groupsB);

    // 2. Check Members
    console.log('   Checking Members (Should be 0)...');
    const membersB = await (await fetch(`${BASE_URL}/api/members`, { headers: headersB })).json();
    if (membersB.length === 0) console.log('   ✅ Members Isolated');
    else console.error('   ❌ DATA LEAK: Saw members:', membersB);

    // 3. Check Dashboard Stats
    console.log('   Checking Dashboard Stats (Should be 0)...');
    const dashB = await (await fetch(`${BASE_URL}/api/dashboard`, { headers: headersB })).json();
    if (dashB.stats.activeGroups === 0 && dashB.stats.totalCollections === 0) console.log('   ✅ Dashboard Isolated');
    else console.error('   ❌ DATA LEAK: Dashboard Stats:', dashB.stats);

    // 4. Check Reports
    console.log('   Checking Reports (Should be empty)...');
    const reportsB = await (await fetch(`${BASE_URL}/api/reports`, { headers: headersB })).json();
    if (reportsB.groupPerformance.length === 0) console.log('   ✅ Reports Isolated');
    else console.error('   ❌ DATA LEAK: Reports:', reportsB.groupPerformance);

    // 5. Check Winners
    console.log('   Checking Winners (Should be 0)...');
    const winnersB = await (await fetch(`${BASE_URL}/api/winners`, { headers: headersB })).json();
    if (winnersB.length === 0) console.log('   ✅ Winners Isolated');
    else console.error('   ❌ DATA LEAK: Winners:', winnersB);

    // =========================================================================
    // 4. ORG A VERIFICATION (Data Presence)
    // =========================================================================
    
    console.log('\n🔵 -- Verifying ORG A Context Again --');
    
    // Check Dashboard Stats
    const dashA = await (await fetch(`${BASE_URL}/api/dashboard`, { headers: headersA })).json();
    if (dashA.stats.activeGroups === 1 && dashA.stats.totalCollections === 5000) console.log('   ✅ Dashboard A Correct (1 Group, 5000 Collected)');
    else console.error('   ❌ Dashboard A Incorrect:', dashA.stats);
    
    // Check Reports
    const reportsA = await (await fetch(`${BASE_URL}/api/reports`, { headers: headersA })).json();
    if (reportsA.groupPerformance.length > 0) console.log('   ✅ Reports A Populated');
    else console.error('   ❌ Reports A Empty');

    console.log('\n✨ All Scope Tests Completed.');
}

verifyAllScope().catch(console.error);
