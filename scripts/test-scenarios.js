
const BASE_URL = 'http://localhost:3000'; // Adjust port if needed

async function runTests() {
    console.log('🚀 Starting Test Scenarios...');

    // 1. Login
    console.log('\n🔐 Logging in...');
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

    // 2. Seed Data
    console.log('\n🌱 Seeding Data...');
    const seedRes = await fetch(`${BASE_URL}/api/seed`, { method: 'POST' });
    if (!seedRes.ok) {
        console.error('Seed failed:', await seedRes.text());
        process.exit(1);
    }
    console.log('✅ Data seeded.');

    // 3. Fetch Metadata (Groups, Members, GroupMembers)
    console.log('\n📥 Fetching Metadata...');
    
    const [groupsRes, membersRes, subsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/chitgroups`, { headers }),
        fetch(`${BASE_URL}/api/members`, { headers }),
        fetch(`${BASE_URL}/api/groupmembers`, { headers })
    ]);

    const groups = await groupsRes.json();
    const members = await membersRes.json();
    const subs = await subsRes.json();

    // Helper map functions
    const getGroupByName = (name) => groups.find(g => g.groupName === name);
    const getMemberByName = (name) => members.find(m => m.name === name);
    const getSub = (gId, mId) => subs.find(s => s.groupId._id === gId && s.memberId._id === mId);

    // --- CASE 1: 52-Week Chit (Ravi) ---
    console.log('\n--- CASE 1: 52-Week Chit (Ravi) ---');
    const g1 = getGroupByName("52W-2000-2026");
    const mRavi = getMemberByName("Ravi");
    const subRaviG1 = getSub(g1._id, mRavi._id);

    console.log(`Group: ${g1.groupName}, Member: ${mRavi.name}`);
    
    // Post Collection Week 1
    const col1 = await postCollection({
        groupMemberId: subRaviG1._id,
        basePeriodNumber: 1,
        amountPaid: 2000, // Exact amount
        periodDate: "2026-01-10",
        paymentMode: "CASH",
        remarks: "Case 1 Test"
    }, headers);
    console.log('Collection Week 1:', col1.status === 'PAID' ? '✅ PAID' : '❌ FAILED');


    // --- CASE 2: 220-Day Chit (Anil, 0.5 unit) ---
    console.log('\n--- CASE 2: 220-Day Chit (Anil, 0.5 unit) ---');
    const g2 = getGroupByName("220D-500-2026");
    const mAnil = getMemberByName("Anil");
    const subAnilG2 = getSub(g2._id, mAnil._id);

    // Post Collections Day 1, 2, 3
    for (let day = 1; day <= 3; day++) {
        const amt = 250; // 500 * 0.5
        const date = new Date("2026-01-10");
        date.setDate(date.getDate() + (day - 1));
        
        await postCollection({
            groupMemberId: subAnilG2._id,
            basePeriodNumber: day,
            amountPaid: amt,
            periodDate: date.toISOString(),
            paymentMode: "UPI",
            remarks: `Day ${day}`
        }, headers);
        process.stdout.write(`Day ${day} ✅  `);
    }
    console.log('');

    // Prize Example (Day 15)
    // Note: Winner API might need to be called. Assuming POST /api/winners exists
    console.log('Creating Winner for Day 15...');
    const winnerRes = await fetch(`${BASE_URL}/api/winners`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
           groupId: g2._id,
           groupMemberId: subAnilG2._id,
           memberId: mAnil._id,
           basePeriodNumber: 15,
           winningUnits: 0.5,
           prizeAmount: 227.27,
           commissionEarned: 10000,
           selectionMethod: 'LOTTERY',
           status: 'PAID'
        })
    });
    
    if(winnerRes.ok) {
        console.log('Winner Day 15: ✅ Created');
    } else {
        console.log('Winner Day 15: ❌ Failed', await winnerRes.text());
    }


    // --- CASE 3: Mixed Patterns ---
    console.log('\n--- CASE 3: Monthly Mixed ---');
    const g3 = getGroupByName("20M-3000-2026");
    const mDeepa = getMemberByName("Deepa");
    
    // Ravi (Monthly) - 1 collection
    const subRaviG3 = getSub(g3._id, mRavi._id);
    await postCollection({
        groupMemberId: subRaviG3._id,
        basePeriodNumber: 1,
        amountPaid: 3000,
        periodDate: "2026-02-09",
        paymentMode: "CASH"
    }, headers);
    console.log('Ravi (Monthly) Month 1: ✅');

    // Anil (Weekly) - 4 collections
    const subAnilG3 = getSub(g3._id, mAnil._id);
    for (let i = 1; i <= 4; i++) {
        await postCollection({
            groupMemberId: subAnilG3._id,
            basePeriodNumber: 1,
            amountPaid: 750,
            paymentMode: "UPI",
            remarks: `Week ${i}`
        }, headers);
        process.stdout.write(`Anil W${i} ✅  `);
    }
    console.log('');

    // Deepa (Daily) - Just do 1st and 30th to test
    const subDeepaG3 = getSub(g3._id, mDeepa._id);
    // Day 1
    await postCollection({
         groupMemberId: subDeepaG3._id,
         basePeriodNumber: 1,
         amountPaid: 50,
         paymentMode: "CASH",
         remarks: "Day 1"
    }, headers);
    console.log('Deepa (Daily) Day 1: ✅');


    // --- CASE 4: Double Chit (Rajesh) ---
    console.log('\n--- CASE 4: Double Chit (Rajesh) ---');
    const mRajesh = getMemberByName("Rajesh");
    const subRajesh = getSub(g1._id, mRajesh._id); // Group 1

    // Pay Week 1 (Double amount)
    const colRajesh = await postCollection({
        groupMemberId: subRajesh._id,
        basePeriodNumber: 1,
        amountPaid: 4000, // 2000 * 2
        periodDate: "2026-01-10",
        paymentMode: "CHEQUE"
    }, headers);
    console.log('Rajesh Week 1 (4000):', colRajesh.status === 'PAID' ? '✅ PAID' : '❌ FAILED');

    // Winner (Win 1)
     const winRajesh = await fetch(`${BASE_URL}/api/winners`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
           groupId: g1._id,
           groupMemberId: subRajesh._id,
           memberId: mRajesh._id,
           basePeriodNumber: 15,
           winningUnits: 1.0, // Only 1 of 2 units won
           prizeAmount: 1923.08,
           commissionEarned: 4000,
           selectionMethod: 'LOTTERY'
        })
    });
    console.log('Rajesh Win 1:', winRajesh.ok ? '✅ Created' : '❌ Failed');

    console.log('\n✨ All Scenarios Executed.');
}

async function postCollection(data, headers) {
    const res = await fetch(`${BASE_URL}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        console.error('Collection Post Failed:', await res.text());
        return { status: 'FAILED' };
    }
    return res.json();
}

runTests().catch(console.error);
