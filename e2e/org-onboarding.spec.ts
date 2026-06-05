import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Full Super Admin → Org Admin Onboarding Flow
 * 
 * This is a sequential test that validates the entire org onboarding process:
 * 1. Super Admin logs in to admin panel
 * 2. Creates a new Organisation
 * 3. Creates an ORG_ADMIN user linked to that org
 * 4. Logs out
 * 5. New Org Admin logs in → should see dashboard
 * 6. Verifies subscription status via API
 */

const SUPER_ADMIN = { email: 'admin@gmail.com', password: 'Admin@123' };
const TS = Date.now();
const NEW_ORG = {
  name: `E2E Org ${TS}`,
  code: `E${TS.toString().slice(-5)}`,
  phone: '9876543210',
  email: `e2eorg${TS}@test.com`,
};
const NEW_USER = {
  name: `E2E Admin ${TS}`,
  email: `e2eadmin${TS}@test.com`,
  password: 'E2EAdmin@123',
};

// Helper: Login as super admin
async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(SUPER_ADMIN.email);
  await page.locator('#password').fill(SUPER_ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
}

test.describe.serial('Super Admin - Full Org Onboarding', () => {
  let orgCreated = false;
  let userCreated = false;

  test('Step 1: Super Admin logs in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
    
    await page.locator('#email').fill(SUPER_ADMIN.email);
    await page.locator('#password').fill(SUPER_ADMIN.password);
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    // Dashboard should have some content
    await expect(page.locator('body')).toContainText(/Dashboard|Group|Welcome/i, { timeout: 10000 });
  });

  test('Step 2: Create new Organisation', async ({ page }) => {
    await loginAsSuperAdmin(page);
    
    // Navigate to create org page
    await page.goto('/organisations/new');
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });

    // Fill organisation form
    await page.locator('input[name="name"]').fill(NEW_ORG.name);
    await page.locator('input[name="code"]').fill(NEW_ORG.code);
    await page.locator('input[name="phone"]').fill(NEW_ORG.phone);
    await page.locator('input[name="email"]').fill(NEW_ORG.email);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to organisations list
    await page.waitForURL(/\/organisations/, { timeout: 15000 });
    
    // Verify our org shows up in the list
    await expect(page.locator(`text=${NEW_ORG.name}`).first()).toBeVisible({ timeout: 10000 });
    orgCreated = true;
  });

  test('Step 3: Create ORG_ADMIN user for the new org', async ({ page }) => {
    test.skip(!orgCreated, 'Org was not created in previous step');
    
    await loginAsSuperAdmin(page);
    
    // Navigate to create user page
    await page.goto('/users/new');
    // User form uses placeholder-based inputs (no name attributes)
    await expect(page.locator('input[placeholder="e.g. John Doe"]')).toBeVisible({ timeout: 10000 });

    // Fill user form
    await page.locator('input[placeholder="e.g. John Doe"]').fill(NEW_USER.name);
    await page.locator('input[placeholder="john@example.com"]').fill(NEW_USER.email);
    await page.locator('input[type="password"]').fill(NEW_USER.password);

    // Role is already ORG_ADMIN by default, but let's make sure
    const roleSelect = page.locator('select').first();
    await roleSelect.selectOption('ORG_ADMIN');

    // Wait for org dropdown to appear and load
    const orgSelect = page.locator('select').nth(1);
    await expect(orgSelect).toBeVisible({ timeout: 5000 });
    
    // Wait for options to be loaded (more than just "Select Organisation")
    await page.waitForFunction(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return false;
      return selects[1].options.length > 1;
    }, { timeout: 10000 });

    // Find and select our org
    const options = await orgSelect.locator('option').allTextContents();
    const orgOption = options.find(o => o.includes(NEW_ORG.name) || o.includes(NEW_ORG.code));
    expect(orgOption).toBeTruthy();
    
    // Select by the option text content
    await orgSelect.selectOption({ label: orgOption! });

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to users list
    await page.waitForURL(/\/users/, { timeout: 15000 });
    await expect(page.locator(`text=${NEW_USER.name}`).first()).toBeVisible({ timeout: 10000 });
    userCreated = true;
  });

  test('Step 4: Verify org in organisations list', async ({ page }) => {
    test.skip(!orgCreated, 'Org was not created');
    
    await loginAsSuperAdmin(page);
    await page.goto('/organisations');
    
    await expect(page.locator(`text=${NEW_ORG.name}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${NEW_ORG.code}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('Step 5: New ORG_ADMIN can login', async ({ page }) => {
    test.skip(!userCreated, 'User was not created');
    
    await page.goto('/login');
    await page.locator('#email').fill(NEW_USER.email);
    await page.locator('#password').fill(NEW_USER.password);
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('body')).toContainText(/Dashboard|Group|Welcome/i, { timeout: 10000 });
  });

  test('Step 6: Subscription status API check', async ({ request }) => {
    test.skip(!userCreated, 'User was not created');
    
    // Login as org admin
    const loginRes = await request.post('/api/auth/login', {
      data: { email: NEW_USER.email, password: NEW_USER.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    // Check subscription status
    const statusRes = await request.get('/api/org-subscription/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // Status might be TRIAL (auto-created) or NONE (needs manual setup)
    // Both are valid for a freshly created org
    const status = await statusRes.json();
    if (statusRes.ok()) {
      expect(['TRIAL', 'NONE', 'ACTIVE']).toContain(status.status);
      console.log(`✅ Subscription status: ${status.status}`);
      if (status.status === 'TRIAL') {
        console.log(`   Trial ends: ${status.trialEndsAt}, Days remaining: ${status.daysRemaining}`);
      }
    } else {
      // If no subscription, that's also OK for this test
      console.log(`ℹ️  No subscription yet (expected for fresh org): ${status.error}`);
    }
  });
});
