import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * E2E tests for the admin completion work:
 *  - Phase 1: Settings (security / notifications / preferences) + change-password
 *  - Phase 2: Reports filters + CSV/Excel/PDF export
 *  - Phase 3: login rate limiting, unique phone per org, bulk enrollment, audit logging
 *  - Phase 4: group create/edit restricted to ORG_ADMIN, super-admin read-only notice
 */

const SUPER_ADMIN = { email: 'admin@gmail.com', password: 'Admin@123' };
const TS = Date.now();

const NEW_ORG = {
  name: `Test Org ${TS}`,
  code: `T${TS.toString().slice(-6)}`,
  phone: '9876500000',
  email: `testorg${TS}@test.com`,
};
const ORG_ADMIN = {
  name: `Test OrgAdmin ${TS}`,
  email: `orgadmin${TS}@test.com`,
  password: 'OrgAdmin@123',
};

// Shared state across the serial suite
let superToken = '';
let orgToken = '';
let orgId = '';
let groupId = '';
const memberIds: string[] = [];

async function loginApi(request: APIRequestContext, email: string, password: string) {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  expect(res.ok(), `login failed for ${email}: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return body.token as string;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test.describe.serial('Admin completion features', () => {
  test('Setup: login super admin, create org + org admin', async ({ request }) => {
    superToken = await loginApi(request, SUPER_ADMIN.email, SUPER_ADMIN.password);

    const orgRes = await request.post('/api/organisations', {
      headers: auth(superToken),
      data: NEW_ORG,
    });
    expect(orgRes.status(), await orgRes.text()).toBe(201);
    const org = await orgRes.json();
    orgId = org._id;
    expect(orgId).toBeTruthy();

    const userRes = await request.post('/api/users', {
      headers: auth(superToken),
      data: {
        name: ORG_ADMIN.name,
        email: ORG_ADMIN.email,
        password: ORG_ADMIN.password,
        role: 'ORG_ADMIN',
        organisationId: orgId,
      },
    });
    expect(userRes.status(), await userRes.text()).toBe(201);

    orgToken = await loginApi(request, ORG_ADMIN.email, ORG_ADMIN.password);
    expect(orgToken).toBeTruthy();
  });

  // ---------- Phase 1: Settings ----------
  test.describe('Settings', () => {
    test('GET /api/settings requires auth (401)', async ({ request }) => {
      const res = await request.get('/api/settings');
      expect(res.status()).toBe(401);
    });

    test('GET /api/settings forbidden for org admin (403)', async ({ request }) => {
      const res = await request.get('/api/settings', { headers: auth(orgToken) });
      expect(res.status()).toBe(403);
    });

    test('Super admin can read + update settings and value persists', async ({ request }) => {
      const getRes = await request.get('/api/settings', { headers: auth(superToken) });
      expect(getRes.ok()).toBeTruthy();
      const settings = await getRes.json();
      expect(settings).toHaveProperty('currency');
      expect(settings).toHaveProperty('pushEnabled');

      const newName = `Sender ${TS}`;
      const putRes = await request.put('/api/settings', {
        headers: auth(superToken),
        data: { notificationFromName: newName, currency: 'INR' },
      });
      expect(putRes.ok()).toBeTruthy();
      const updated = await putRes.json();
      expect(updated.notificationFromName).toBe(newName);

      // Confirm persistence on a fresh read
      const reRead = await request.get('/api/settings', { headers: auth(superToken) });
      const reReadBody = await reRead.json();
      expect(reReadBody.notificationFromName).toBe(newName);
    });

    test('change-password rejects wrong current password without changing it', async ({ request }) => {
      const res = await request.post('/api/auth/change-password', {
        headers: auth(superToken),
        data: { currentPassword: 'definitely-wrong', newPassword: 'NewPass@123' },
      });
      expect([400, 401]).toContain(res.status());
      // Super admin password must still work
      const stillWorks = await request.post('/api/auth/login', {
        data: { email: SUPER_ADMIN.email, password: SUPER_ADMIN.password },
      });
      expect(stillWorks.ok()).toBeTruthy();
    });

    test('change-password rejects too-short new password', async ({ request }) => {
      const res = await request.post('/api/auth/change-password', {
        headers: auth(superToken),
        data: { currentPassword: SUPER_ADMIN.password, newPassword: '123' },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ---------- Phase 2: Reports ----------
  test.describe('Reports', () => {
    test('GET /api/reports returns aggregated structure', async ({ request }) => {
      const res = await request.get('/api/reports', { headers: auth(superToken) });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('trends');
    });

    test('CSV export returns text/csv', async ({ request }) => {
      const res = await request.get('/api/reports/export?format=csv', { headers: auth(superToken) });
      expect(res.ok()).toBeTruthy();
      expect(res.headers()['content-type']).toContain('csv');
    });

    test('Excel export returns spreadsheet content type', async ({ request }) => {
      const res = await request.get('/api/reports/export?format=excel', { headers: auth(superToken) });
      expect(res.ok()).toBeTruthy();
      expect(res.headers()['content-type']).toContain('spreadsheet');
    });

    test('PDF export returns application/pdf', async ({ request }) => {
      const res = await request.get('/api/reports/export?format=pdf', { headers: auth(superToken) });
      expect(res.ok()).toBeTruthy();
      expect(res.headers()['content-type']).toContain('pdf');
    });
  });

  // ---------- Phase 3: Members (unique phone) ----------
  test.describe('Members & unique phone per org', () => {
    const phone = `90000${TS.toString().slice(-5)}`;

    test('Org admin can create a member', async ({ request }) => {
      const res = await request.post('/api/members', {
        headers: auth(orgToken),
        data: { name: `Member A ${TS}`, phone },
      });
      expect(res.status(), await res.text()).toBe(201);
      const member = await res.json();
      memberIds.push(member._id);
    });

    test('Duplicate phone in same org is rejected (409)', async ({ request }) => {
      const res = await request.post('/api/members', {
        headers: auth(orgToken),
        data: { name: `Member B ${TS}`, phone },
      });
      expect(res.status()).toBe(409);
    });

    test('Create a few more members for bulk enroll', async ({ request }) => {
      for (let i = 0; i < 3; i++) {
        const res = await request.post('/api/members', {
          headers: auth(orgToken),
          data: { name: `Bulk Member ${i} ${TS}`, phone: `9111${i}${TS.toString().slice(-5)}` },
        });
        expect(res.status()).toBe(201);
        const m = await res.json();
        memberIds.push(m._id);
      }
      expect(memberIds.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ---------- Phase 4: Group create/edit restricted to ORG_ADMIN ----------
  test.describe('Group creation restricted to ORG_ADMIN', () => {
    const groupPayload = () => ({
      groupName: `Test Group ${TS}`,
      frequency: 'MONTHLY',
      contributionAmount: 1000,
      totalUnits: 20,
      totalPeriods: 20,
      commissionValue: 5,
      startDate: new Date().toISOString(),
      status: 'ACTIVE',
    });

    test('Super admin cannot create a group (403)', async ({ request }) => {
      const res = await request.post('/api/chitgroups', {
        headers: auth(superToken),
        data: { ...groupPayload(), organisationId: orgId },
      });
      expect(res.status()).toBe(403);
    });

    test('Org admin can create a group (201)', async ({ request }) => {
      const res = await request.post('/api/chitgroups', {
        headers: auth(orgToken),
        data: groupPayload(),
      });
      expect(res.status(), await res.text()).toBe(201);
      const group = await res.json();
      groupId = group._id;
      expect(groupId).toBeTruthy();
    });

    test('Super admin cannot edit a group (403)', async ({ request }) => {
      test.skip(!groupId, 'group not created');
      const res = await request.put(`/api/chitgroups/${groupId}`, {
        headers: auth(superToken),
        data: { groupName: `Hacked ${TS}` },
      });
      expect(res.status()).toBe(403);
    });

    test('Org admin can edit their group (200)', async ({ request }) => {
      test.skip(!groupId, 'group not created');
      const res = await request.put(`/api/chitgroups/${groupId}`, {
        headers: auth(orgToken),
        data: { groupName: `Renamed Group ${TS}` },
      });
      expect(res.ok()).toBeTruthy();
    });
  });

  // ---------- Phase 3: Bulk enrollment ----------
  test.describe('Bulk enrollment', () => {
    test('Bulk enroll multiple members into the group', async ({ request }) => {
      test.skip(!groupId || memberIds.length < 2, 'missing group or members');
      const res = await request.post('/api/groupmembers/bulk', {
        headers: auth(orgToken),
        data: {
          groupId,
          members: memberIds.map((id) => ({ memberId: id, units: 1 })),
        },
      });
      expect([201, 200]).toContain(res.status());
      const body = await res.json();
      expect(body.enrolled).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.results)).toBeTruthy();
    });

    test('Re-enrolling the same members reports them as failed (already enrolled)', async ({ request }) => {
      test.skip(!groupId || memberIds.length < 1, 'missing group or members');
      const res = await request.post('/api/groupmembers/bulk', {
        headers: auth(orgToken),
        data: { groupId, members: [{ memberId: memberIds[0], units: 1 }] },
      });
      const body = await res.json();
      expect(body.failed).toBeGreaterThanOrEqual(1);
    });

    test('Bulk enroll rejects empty members array (400)', async ({ request }) => {
      const res = await request.post('/api/groupmembers/bulk', {
        headers: auth(orgToken),
        data: { groupId, members: [] },
      });
      expect(res.status()).toBe(400);
    });
  });

  // ---------- Phase 3: Login rate limiting ----------
  test('Repeated bad logins are rate limited (429 with Retry-After)', async ({ request }) => {
    const victimEmail = `ratelimit${TS}@test.com`;
    let got429 = false;
    let retryAfter: string | null = null;

    for (let i = 0; i < 12; i++) {
      const res = await request.post('/api/auth/login', {
        data: { email: victimEmail, password: 'wrong-password' },
      });
      if (res.status() === 429) {
        got429 = true;
        retryAfter = res.headers()['retry-after'] ?? null;
        break;
      }
    }

    expect(got429, 'expected a 429 after repeated bad logins').toBeTruthy();
    expect(retryAfter).toBeTruthy();
  });

  // ---------- Phase 4: UI read-only notice for super admin ----------
  test('Super admin sees read-only notice on /groups/new (UI)', async ({ page }) => {
    await loginUi(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await page.goto('/groups/new');
    await expect(page.locator('body')).toContainText(/Organisation Admins/i, { timeout: 10000 });
  });

  // ---------- Phase 1: Settings sub-pages render (UI) ----------
  test('Settings sub-pages are reachable (UI)', async ({ page }) => {
    await loginUi(page, SUPER_ADMIN.email, SUPER_ADMIN.password);

    await page.goto('/settings/security');
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });

    await page.goto('/settings/notifications');
    await expect(page.locator('body')).toContainText(/Notification|Email|SMS|Push/i, { timeout: 10000 });

    await page.goto('/settings/preferences');
    await expect(page.locator('body')).toContainText(/Currency|Timezone|Language|Date/i, { timeout: 10000 });
  });
});

// Helper: login through the UI
async function loginUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
}
