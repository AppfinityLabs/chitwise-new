
const BASE_URL = 'http://localhost:3000';

// Helper to wait
const delay = ms => new Promise(res => setTimeout(res, ms));

async function verifyEditDelete() {
    console.log('🚀 Starting Edit/Delete Verification...');

    // 1. Login
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

    // 1.5 Create Dummy Organisation
    console.log('\n🏢 Creating Dummy Organisation for Test...');
    const orgRes = await fetch(`${BASE_URL}/api/organisations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "Test Org For Edit",
            code: `TOFE-${Date.now()}`
        })
    });
    const org = await orgRes.json();

    // 2. Create a Dummy User to Edit
    console.log('\n👤 Creating Dummy Org Admin...');
    const createRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "To Be Edited",
            email: `editme.${Date.now()}@test.com`,
            password: "Password@123",
            role: "ORG_ADMIN",
            organisationId: org._id
        })
    });
    
    const user = await createRes.json();
    console.log(`✅ Created User: ${user.name} (${user._id})`);

    // 3. Edit the User
    console.log('\n✏️ Updating User Name...');
    const updateRes = await fetch(`${BASE_URL}/api/users/${user._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            name: "Edited Name"
        })
    });
    
    if(updateRes.ok) {
        const updated = await updateRes.json();
        console.log(`✅ Update Successful: Name is now "${updated.name}"`);
    } else {
        console.error('❌ Update Failed:', await updateRes.text());
    }

    // 4. Try to Delete the User
    console.log('\n🗑️ Deleting the User...');
    const deleteRes = await fetch(`${BASE_URL}/api/users/${user._id}`, {
        method: 'DELETE',
        headers
    });
    
    if(deleteRes.ok) {
        console.log('✅ Delete Successful');
    } else {
        console.error('❌ Delete Failed:', await deleteRes.text());
    }

    // 5. Verify Deletion
    const verifyRes = await fetch(`${BASE_URL}/api/users/${user._id}`, { headers });
    if(verifyRes.status === 404) {
        console.log('✅ Verified: User no longer exists (404)');
    } else {
        console.error('❌ Failed: User still exists');
    }
    
    // 6. Test Role Promotion Restriction
    console.log('\n🛡️ Testing Role Promotion Restriction...');
    // Create another dummy
    const promoRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: "Promo Test",
            email: `promo.${Date.now()}@test.com`,
            password: "Password@123",
            role: "ORG_ADMIN",
            organisationId: org._id
        })
    });
    const promoUser = await promoRes.json();
    
    // Try to promote to SUPER_ADMIN
    const attemptPromo = await fetch(`${BASE_URL}/api/users/${promoUser._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: "SUPER_ADMIN" })
    });
    
    if (attemptPromo.status === 403) {
        console.log('✅ Protected: Cannot promote to Super Admin (403 Forbidden)');
    } else {
        console.error(`❌ Failed: Promotion returned ${attemptPromo.status}`);
    }

    // Cleanup
    await fetch(`${BASE_URL}/api/users/${promoUser._id}`, { method: 'DELETE', headers });


    // 7. Try to Delete Super Admin (Self) - Should Fail
    console.log('\n🛡️ Testing Super Admin Protection...');
    // We need Super Admin ID first. Let's list users to find it.
    const listRes = await fetch(`${BASE_URL}/api/users`, { headers });
    const users = await listRes.json();
    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');
    
    if(superAdmin) {
        const saDeleteRes = await fetch(`${BASE_URL}/api/users/${superAdmin._id}`, {
            method: 'DELETE',
            headers
        });
        
        if(saDeleteRes.status === 403) {
             console.log('✅ Protected: Cannot delete Super Admin (403 Forbidden)');
        } else {
             console.error(`❌ Failed: Super Admin deletion returned ${saDeleteRes.status}`);
        }
    }

    console.log('\n✨ Edit/Delete Verification Complete.');
}

verifyEditDelete().catch(console.error);
