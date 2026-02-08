# ChitWise - Comprehensive Test Cases Documentation

ഈ ഡോക്യുമെന്റ് ChitWise ആപ്ലിക്കേഷന്റെ എല്ലാ ഫീച്ചർസ്, യൂസർ റോൾസ്, ബിസിനസ് ലോജിക്, API ഫങ്ക്ഷനാലിറ്റികൾ എന്നിവയുടെ ടെസ്റ്റ് കേസുകൾ ഉൾക്കൊള്ളുന്നു.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Types & Roles](#user-types--roles)
3. [Authentication Test Cases](#1-authentication-test-cases)
4. [Organisation Management Test Cases](#2-organisation-management-test-cases)
5. [User Management Test Cases](#3-user-management-test-cases)
6. [Member Management Test Cases](#4-member-management-test-cases)
7. [Chit Group Test Cases](#5-chit-group-test-cases)
8. [Group Member (Subscription) Test Cases](#6-group-member-subscription-test-cases)
9. [Collection Logic Test Cases](#7-collection-logic-test-cases)
10. [Pending Amount Calculation Test Cases](#8-pending-amount-calculation-test-cases)
11. [Winner/Draw Test Cases](#9-winnerdraw-test-cases)
12. [Dashboard Test Cases](#10-dashboard-test-cases)
13. [Reports Test Cases](#11-reports-test-cases)
14. [Role-Based Access Control Test Cases](#12-role-based-access-control-test-cases)

---

## System Overview

ChitWise ഒരു **Chit Fund Management System** ആണ്. ഇതിന്റെ പ്രധാന എന്റിറ്റികൾ:

| Entity | Description |
|--------|-------------|
| **Organisation** | Independent chit fund company (Name, Code, GST, PAN) |
| **User** | System users with roles (SUPER_ADMIN, ORG_ADMIN) |
| **Member** | Chit fund subscribers (Name, Phone, KYC status) |
| **ChitGroup** | Chit fund scheme (Frequency, Contribution, Periods) |
| **GroupMember** | Subscription linking Member to ChitGroup (Units, Collection Pattern) |
| **Collection** | Payment records from members |
| **Winner** | Draw winners for each period |

---

## User Types & Roles

### Role 1: SUPER_ADMIN (സൂപ്പർ അഡ്മിൻ)

| Feature | Access Level |
|---------|--------------|
| Organisations | ✅ Full CRUD - Create, Read, Update, Delete |
| Users | ✅ Full CRUD - Can create ORG_ADMIN users |
| Chit Groups | ✅ View all orgs, Create with org filter |
| Members | ✅ View all orgs, Create with org filter |
| Collections | ✅ View all, Filter by org |
| Winners | ✅ View all, Create for any org |
| Dashboard | ✅ System-wide stats |
| Reports | ✅ System-wide reports |

### Role 2: ORG_ADMIN (ഓർഗ് അഡ്മിൻ)

| Feature | Access Level |
|---------|--------------|
| Organisations | ❌ Cannot access |
| Users | ❌ Cannot create/view other users |
| Chit Groups | ✅ Own org only - Auto-scoped |
| Members | ✅ Own org only - Auto-scoped |
| Collections | ✅ Own org only - Auto-filtered |
| Winners | ✅ Own org only - Auto-filtered |
| Dashboard | ✅ Org-specific stats |
| Reports | ✅ Org-specific reports |

---

## 1. Authentication Test Cases

### TC-AUTH-001: Successful Login
| Field | Value |
|-------|-------|
| **Scenario** | Valid user logs in with correct credentials |
| **Precondition** | User exists in database with ACTIVE status |
| **Input** | Email: `org@gmail.com`, Password: `123456` |
| **Expected Result** | JWT token generated, stored in cookie, redirect to dashboard |
| **API** | `POST /api/auth/login` |

### TC-AUTH-002: Invalid Password Login
| Field | Value |
|-------|-------|
| **Scenario** | User attempts login with wrong password |
| **Precondition** | User exists |
| **Input** | Email: `org@gmail.com`, Password: `wrongpass` |
| **Expected Result** | 401 Unauthorized, Error message: "Invalid credentials" |

### TC-AUTH-003: Non-existent User Login
| Field | Value |
|-------|-------|
| **Scenario** | Login attempt with email that doesn't exist |
| **Input** | Email: `nonexistent@test.com`, Password: `any` |
| **Expected Result** | 401 Unauthorized, Error message: "Invalid credentials" |

### TC-AUTH-004: Inactive User Login
| Field | Value |
|-------|-------|
| **Scenario** | User with INACTIVE status tries to login |
| **Precondition** | User exists with status: INACTIVE |
| **Expected Result** | Login should be denied or limited |

### TC-AUTH-005: Logout
| Field | Value |
|-------|-------|
| **Scenario** | Authenticated user logs out |
| **Precondition** | User is logged in with valid token |
| **Expected Result** | Cookie cleared, redirect to login page |
| **API** | `POST /api/auth/logout` |

### TC-AUTH-006: Get Current User (Me)
| Field | Value |
|-------|-------|
| **Scenario** | Fetch currently logged in user details |
| **Precondition** | Valid JWT token in cookie |
| **Expected Result** | Returns user object (id, email, name, role, organisationId) |
| **API** | `GET /api/auth/me` |

### TC-AUTH-007: Token Expiry
| Field | Value |
|-------|-------|
| **Scenario** | Request with expired JWT token |
| **Expected Result** | 401 Unauthorized, "Invalid token" error |

### TC-AUTH-008: No Token - Protected Route
| Field | Value |
|-------|-------|
| **Scenario** | Access protected API without token |
| **Expected Result** | 401 Unauthorized, "Please login" error |

---

## 2. Organisation Management Test Cases

> **Note**: Only SUPER_ADMIN can access organisation endpoints

### TC-ORG-001: Create Organisation
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin creates new organisation |
| **User Role** | SUPER_ADMIN |
| **Input** | `{ name: "Sunshine Chits", code: "SUN01", gstNumber: "GST123", panNumber: "PAN456" }` |
| **Expected Result** | 201 Created, Organisation document returned |
| **API** | `POST /api/organisations` |

### TC-ORG-002: Duplicate Organisation Code
| Field | Value |
|-------|-------|
| **Scenario** | Create org with existing code |
| **Input** | Code that already exists |
| **Expected Result** | 400 Bad Request, Duplicate error |

### TC-ORG-003: List All Organisations
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin fetches all organisations |
| **User Role** | SUPER_ADMIN |
| **Expected Result** | Array of all organisations, sorted by name |
| **API** | `GET /api/organisations` |

### TC-ORG-004: ORG_ADMIN Access Denied
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin tries to access organisations |
| **User Role** | ORG_ADMIN |
| **Expected Result** | 403 Forbidden |

### TC-ORG-005: Update Organisation
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin updates org details |
| **User Role** | SUPER_ADMIN |
| **Input** | `{ name: "New Name", address: "New Address" }` |
| **Expected Result** | 200 OK, Updated document |
| **API** | `PUT /api/organisations/[id]` |

### TC-ORG-006: Get Single Organisation
| Field | Value |
|-------|-------|
| **Scenario** | Fetch specific organisation by ID |
| **User Role** | SUPER_ADMIN |
| **Expected Result** | Single organisation object |
| **API** | `GET /api/organisations/[id]` |

---

## 3. User Management Test Cases

> **Note**: Only SUPER_ADMIN can manage users

### TC-USER-001: Create ORG_ADMIN User
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin creates new Org Admin |
| **User Role** | SUPER_ADMIN |
| **Input** | `{ name: "John", email: "john@org.com", password: "123456", role: "ORG_ADMIN", organisationId: "org_id_here" }` |
| **Expected Result** | 201 Created, User without password returned |
| **API** | `POST /api/users` |

### TC-USER-002: Create ORG_ADMIN Without Organisation
| Field | Value |
|-------|-------|
| **Scenario** | Create ORG_ADMIN without organisationId |
| **Input** | Role: ORG_ADMIN, No organisationId |
| **Expected Result** | 400 Bad Request, "Organisation is required for Organisation Admin" |

### TC-USER-003: Duplicate Email
| Field | Value |
|-------|-------|
| **Scenario** | Create user with existing email |
| **Expected Result** | 400 Bad Request, "User with this email already exists" |

### TC-USER-004: Create SUPER_ADMIN User
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin creates another Super Admin |
| **Input** | `{ role: "SUPER_ADMIN", ...other fields }` |
| **Expected Result** | 201 Created, No organisationId required |

### TC-USER-005: List All Users
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin fetches all users |
| **User Role** | SUPER_ADMIN |
| **Expected Result** | Array of users (password excluded), sorted by createdAt desc |
| **API** | `GET /api/users` |

### TC-USER-006: ORG_ADMIN Access Denied to Users
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin tries to list users |
| **User Role** | ORG_ADMIN |
| **Expected Result** | 403 Forbidden |

### TC-USER-007: Update User Status
| Field | Value |
|-------|-------|
| **Scenario** | Deactivate a user |
| **Input** | `{ status: "INACTIVE" }` |
| **Expected Result** | User status updated |
| **API** | `PUT /api/users/[id]` |

---

## 4. Member Management Test Cases

### TC-MEM-001: Create Member (ORG_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin creates new member |
| **User Role** | ORG_ADMIN |
| **Input** | `{ name: "Raju", phone: "9876543210", email: "raju@test.com", address: "Kerala" }` |
| **Expected Result** | 201 Created, organisationId auto-assigned from user |
| **API** | `POST /api/members` |

### TC-MEM-002: Create Member (SUPER_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin creates member |
| **User Role** | SUPER_ADMIN |
| **Input** | Must include organisationId |
| **Expected Result** | 201 Created with specified org |

### TC-MEM-003: Create Member Without Org (SUPER_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin creates member without specifying org |
| **Expected Result** | 400 Bad Request, "Organisation ID is required for Super Admin" |

### TC-MEM-004: Duplicate Phone Number
| Field | Value |
|-------|-------|
| **Scenario** | Create member with existing phone |
| **Expected Result** | 400 Bad Request, Duplicate error |

### TC-MEM-005: List Members (ORG_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin lists members |
| **User Role** | ORG_ADMIN |
| **Expected Result** | Only members from own organisation, sorted by name |
| **API** | `GET /api/members` |

### TC-MEM-006: List Members (SUPER_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin lists all members |
| **User Role** | SUPER_ADMIN |
| **Expected Result** | All members across all organisations |

### TC-MEM-007: Update Member Details
| Field | Value |
|-------|-------|
| **Scenario** | Update member information |
| **Input** | `{ name: "Raju Updated", kycVerified: true }` |
| **Expected Result** | 200 OK, Member updated |
| **API** | `PUT /api/members/[id]` |

### TC-MEM-008: Deactivate Member
| Field | Value |
|-------|-------|
| **Scenario** | Set member status to INACTIVE |
| **Expected Result** | Member status changed, still visible in lists |

---

## 5. Chit Group Test Cases

### TC-GRP-001: Create Monthly Chit Group
| Field | Value |
|-------|-------|
| **Scenario** | Create a standard monthly chit group |
| **Input** | ```{ groupName: "1 Lakh Monthly", frequency: "MONTHLY", contributionAmount: 5000, totalUnits: 20, totalPeriods: 20, commissionValue: 5000, startDate: "2026-01-01" }``` |
| **Expected Result** | Pot Value = 5000 × 20 = ₹1,00,000 |
| **API** | `POST /api/chitgroups` |

### TC-GRP-002: Create Weekly Chit Group
| Field | Value |
|-------|-------|
| **Scenario** | Create weekly frequency group |
| **Input** | `{ frequency: "WEEKLY", contributionAmount: 1000, totalUnits: 10, totalPeriods: 52 }` |
| **Expected Result** | Group created with weekly calculation |

### TC-GRP-003: Create Daily Chit Group
| Field | Value |
|-------|-------|
| **Scenario** | Create daily frequency group |
| **Input** | `{ frequency: "DAILY", contributionAmount: 100, totalUnits: 100, totalPeriods: 365 }` |
| **Expected Result** | Group created with daily calculation |

### TC-GRP-004: ORG_ADMIN Auto-Scoping
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin creates group without specifying org |
| **User Role** | ORG_ADMIN |
| **Expected Result** | organisationId automatically set from user's org |

### TC-GRP-005: SUPER_ADMIN Requires Org
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin creates group without org |
| **User Role** | SUPER_ADMIN |
| **Expected Result** | 400 Bad Request, "Organisation ID is required for Super Admin" |

### TC-GRP-006: List Groups (ORG_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin fetches groups |
| **Expected Result** | Only groups from own organisation |
| **API** | `GET /api/chitgroups` |

### TC-GRP-007: List Groups with Org Filter (SUPER_ADMIN)
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin filters by organisation |
| **Input** | `?organisationId=xxx` |
| **Expected Result** | Only groups from specified org |

### TC-GRP-008: Update Group Details
| Field | Value |
|-------|-------|
| **Scenario** | Update group name and status |
| **Input** | `{ groupName: "Updated Name", status: "SUSPENDED" }` |
| **Expected Result** | Group updated |
| **API** | `PUT /api/chitgroups/[id]` |

### TC-GRP-009: Clone Chit Group
| Field | Value |
|-------|-------|
| **Scenario** | Clone existing group to create new one |
| **API** | `POST /api/chitgroups/[id]/clone` |
| **Expected Result** | New group created with same settings |

### TC-GRP-010: Close Chit Group
| Field | Value |
|-------|-------|
| **Scenario** | Set group status to CLOSED |
| **Precondition** | All periods completed |
| **Expected Result** | Status changed to CLOSED |

---

## 6. Group Member (Subscription) Test Cases

### TC-SUB-001: Create Subscription - 1 Unit, Monthly Collection
| Field | Value |
|-------|-------|
| **Scenario** | Member joins group with 1 unit, monthly payment |
| **Input** | ```{ groupId: "xxx", memberId: "yyy", units: 1, collectionPattern: "MONTHLY" }``` |
| **Group** | MONTHLY, Contribution ₹5,000, 20 Periods |
| **Expected Calculations** | Total Due = 5000 × 1 × 20 = ₹1,00,000 <br> Collection Factor = 1 <br> Pending Amount = ₹1,00,000 |
| **API** | `POST /api/groupmembers` |

### TC-SUB-002: Create Subscription - 1 Unit, Daily Collection
| Field | Value |
|-------|-------|
| **Scenario** | Member joins monthly group, pays daily |
| **Input** | `{ units: 1, collectionPattern: "DAILY" }` |
| **Group** | MONTHLY, Contribution ₹5,000 |
| **Expected Calculations** | Collection Factor = 30 <br> Daily Due = 5000 / 30 = ₹166.67 |

### TC-SUB-003: Create Subscription - 1 Unit, Weekly Collection
| Field | Value |
|-------|-------|
| **Scenario** | Member joins monthly group, pays weekly |
| **Input** | `{ units: 1, collectionPattern: "WEEKLY" }` |
| **Group** | MONTHLY |
| **Expected Calculations** | Collection Factor = 4 <br> Weekly Due = 5000 / 4 = ₹1,250 |

### TC-SUB-004: Create Subscription - 2 Units
| Field | Value |
|-------|-------|
| **Scenario** | Member takes 2 units |
| **Input** | `{ units: 2, collectionPattern: "MONTHLY" }` |
| **Expected Calculations** | Total Due = 5000 × 2 × 20 = ₹2,00,000 <br> Per Period = ₹10,000 |

### TC-SUB-005: Create Subscription - 0.5 Unit
| Field | Value |
|-------|-------|
| **Scenario** | Member takes half unit |
| **Input** | `{ units: 0.5, collectionPattern: "MONTHLY" }` |
| **Expected Calculations** | Total Due = 5000 × 0.5 × 20 = ₹50,000 |

### TC-SUB-006: Weekly Group, Daily Collection
| Field | Value |
|-------|-------|
| **Scenario** | Member joins weekly group, pays daily |
| **Group** | WEEKLY, Contribution ₹1,000 |
| **Expected Calculations** | Collection Factor = 7 <br> Daily Due = 1000 / 7 = ₹142.86 |

### TC-SUB-007: Daily Group Collection
| Field | Value |
|-------|-------|
| **Scenario** | Member joins daily group |
| **Group** | DAILY, Contribution ₹100 |
| **Expected Calculations** | Collection Factor = 1 (cannot be more granular) |

### TC-SUB-008: List Subscriptions with Overdue Calculation
| Field | Value |
|-------|-------|
| **Scenario** | Fetch subscriptions with dynamic overdue |
| **Setup** | Group at Period 3, Member paid ₹9,000 (should have ₹15,000) |
| **Expected Result** | overdueAmount = 15000 - 9000 = ₹6,000 |
| **API** | `GET /api/groupmembers?groupId=xxx` |

### TC-SUB-009: Filter by Group
| Field | Value |
|-------|-------|
| **Scenario** | Get all members of specific group |
| **API** | `GET /api/groupmembers?groupId=xxx` |

### TC-SUB-010: Filter by Member
| Field | Value |
|-------|-------|
| **Scenario** | Get all subscriptions of specific member |
| **API** | `GET /api/groupmembers?memberId=yyy` |

---

## 7. Collection Logic Test Cases

### TC-COL-001: First Collection of Period
| Field | Value |
|-------|-------|
| **Scenario** | Record first payment for Period 1 |
| **Input** | ```{ groupMemberId: "xxx", basePeriodNumber: 1, amountPaid: 170, paymentMode: "CASH" }``` |
| **Subscription** | Daily collection, Factor = 30 |
| **Expected Result** | collectionSequence = 1 <br> Subscription.totalCollected += 170 <br> Subscription.pendingAmount -= 170 |
| **API** | `POST /api/collections` |

### TC-COL-002: Subsequent Collections Same Period
| Field | Value |
|-------|-------|
| **Scenario** | Record 2nd, 3rd... payment for Period 1 |
| **Precondition** | 1 collection already exists for Period 1 |
| **Expected Result** | collectionSequence = 2, 3, 4... |

### TC-COL-003: Exceed Collection Factor Limit
| Field | Value |
|-------|-------|
| **Scenario** | Try to record 31st collection for Factor 30 |
| **Precondition** | 30 collections already exist for Period 1 |
| **Expected Result** | 400 Error: "All 30 collections for period 1 are already recorded" |

### TC-COL-004: Collection via UPI
| Field | Value |
|-------|-------|
| **Scenario** | Record payment with UPI mode |
| **Input** | `{ paymentMode: "UPI", amountPaid: 1000 }` |
| **Expected Result** | Collection recorded with paymentMode = "UPI" |

### TC-COL-005: Collection via Bank Transfer
| Field | Value |
|-------|-------|
| **Scenario** | Record payment with bank transfer |
| **Input** | `{ paymentMode: "BANK_TRANSFER" }` |
| **Expected Result** | Collection recorded correctly |

### TC-COL-006: Collection via Cheque
| Field | Value |
|-------|-------|
| **Scenario** | Record cheque payment |
| **Input** | `{ paymentMode: "CHEQUE", remarks: "Cheque #12345" }` |
| **Expected Result** | Collection with remarks recorded |

### TC-COL-007: Partial Payment
| Field | Value |
|-------|-------|
| **Scenario** | Member pays less than due amount |
| **Input** | Due: ₹170, Paid: ₹150 |
| **Expected Result** | Collection recorded, pendingAmount calculation updated |

### TC-COL-008: Overpayment
| Field | Value |
|-------|-------|
| **Scenario** | Member pays more than due amount |
| **Input** | Due: ₹170, Paid: ₹200 |
| **Expected Result** | Collection recorded, extra amount credited |

### TC-COL-009: Subscription Auto-Close
| Field | Value |
|-------|-------|
| **Scenario** | Final payment brings pending to 0 |
| **Precondition** | pendingAmount = 1000, payment = 1000 |
| **Expected Result** | Subscription status = "CLOSED" |

### TC-COL-010: List Collections (ORG_ADMIN Scoped)
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin fetches collections |
| **Expected Result** | Only collections from own organisation's groups |
| **API** | `GET /api/collections` |

### TC-COL-011: Filter by GroupMember
| Field | Value |
|-------|-------|
| **Scenario** | Get payment history for specific subscription |
| **API** | `GET /api/collections?groupMemberId=xxx` |

### TC-COL-012: Filter by Group
| Field | Value |
|-------|-------|
| **Scenario** | Get all payments for a group |
| **API** | `GET /api/collections?groupId=xxx` |

### TC-COL-013: Filter by Member
| Field | Value |
|-------|-------|
| **Scenario** | Get all payments by a member across groups |
| **API** | `GET /api/collections?memberId=yyy` |

---

## 8. Pending Amount Calculation Test Cases

### TC-PEND-001: Total Pending (Initial)
| Field | Value |
|-------|-------|
| **Scenario** | New subscription pending amount |
| **Setup** | Units = 1, Contribution = 5000, Periods = 20 |
| **Formula** | `totalDue = 5000 × 1 × 20 = 1,00,000` |
| **Expected** | `pendingAmount = 1,00,000` |

### TC-PEND-002: Total Pending After Payment
| Field | Value |
|-------|-------|
| **Scenario** | Pending after partial payment |
| **Setup** | totalDue = 1,00,000, payment = 5000 |
| **Expected** | `pendingAmount = 95,000` |

### TC-PEND-003: Current Overdue Calculation
| Field | Value |
|-------|-------|
| **Scenario** | Calculate what should be paid by current period |
| **Setup** | Group at Period 3, Contribution = 5000, Units = 1 |
| **Formula** | `expected = 3 × 5000 × 1 = 15,000` |
| **Actual Paid** | ₹9,000 |
| **Expected Overdue** | `15,000 - 9,000 = 6,000` |

### TC-PEND-004: No Overdue (On Track)
| Field | Value |
|-------|-------|
| **Scenario** | Member is up to date with payments |
| **Setup** | Period = 3, Expected = 15,000, Paid = 16,000 |
| **Expected Overdue** | `0` (max of 0 and negative) |

### TC-PEND-005: Defaulter Identification
| Field | Value |
|-------|-------|
| **Scenario** | Member with significant overdue |
| **Setup** | Overdue > 0 |
| **Expected** | Member flagged as defaulter |

### TC-PEND-006: Multi-Unit Pending Calculation
| Field | Value |
|-------|-------|
| **Scenario** | Pending for 2-unit subscription |
| **Setup** | Units = 2, Contribution = 5000, Period = 3 |
| **Expected by Period 3** | `3 × 5000 × 2 = 30,000` |

---

## 9. Winner/Draw Test Cases

### TC-WIN-001: Record Lottery Winner
| Field | Value |
|-------|-------|
| **Scenario** | Record winner selected by lottery |
| **Input** | ```{ groupId: "xxx", groupMemberId: "yyy", memberId: "zzz", basePeriodNumber: 5, winningUnits: 1, prizeAmount: 95000, commissionEarned: 5000, selectionMethod: "LOTTERY" }``` |
| **Expected Result** | Winner created with status = "PENDING" |
| **API** | `POST /api/winners` |

### TC-WIN-002: Record Auction Winner
| Field | Value |
|-------|-------|
| **Scenario** | Record winner from auction bidding |
| **Input** | `{ selectionMethod: "AUCTION", prizeAmount: 83000 }` |
| **Calculation** | Pot: 1,00,000 - Commission: 5,000 - Discount: 12,000 = 83,000 |
| **Expected Result** | Winner recorded with auction method |

### TC-WIN-003: Mark Winner as Paid
| Field | Value |
|-------|-------|
| **Scenario** | Admin marks payout as completed |
| **Input** | `{ status: "PAID", payoutDate: "2026-02-08" }` |
| **Expected Result** | Winner status updated to PAID |

### TC-WIN-004: Forfeit Winner
| Field | Value |
|-------|-------|
| **Scenario** | Winner forfeits prize (e.g., defaulted payments) |
| **Input** | `{ status: "FORFEITED", remarks: "Excessive arrears" }` |
| **Expected Result** | Status = FORFEITED |

### TC-WIN-005: Validate Subscription Before Winner
| Field | Value |
|-------|-------|
| **Scenario** | Try to create winner with invalid subscription |
| **Input** | Invalid groupMemberId |
| **Expected Result** | 400 Error: "Invalid GroupMember subscription" |

### TC-WIN-006: ORG_ADMIN Scope Validation
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin creates winner for other org's group |
| **Expected Result** | 403 Forbidden: "Group does not belong to your organisation" |

### TC-WIN-007: List Winners (ORG_ADMIN Scoped)
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin fetches winners |
| **Expected Result** | Only winners from own organisation's groups |
| **API** | `GET /api/winners` |

### TC-WIN-008: Filter Winners by Group
| Field | Value |
|-------|-------|
| **Scenario** | Get all winners for specific group |
| **API** | `GET /api/winners?groupId=xxx` |

### TC-WIN-009: Prize Calculation Scenarios
| Field | Value |
|-------|-------|
| **Scenario A** | Full pot (first period lottery) |
| **Calculation** | Pot: 1,00,000 - Commission: 5,000 = ₹95,000 |
| **Scenario B** | Auction with 10% discount |
| **Calculation** | 1,00,000 - 5,000 - 10,000 = ₹85,000 |

---

## 10. Dashboard Test Cases

### TC-DASH-001: ORG_ADMIN Dashboard Stats
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin views dashboard |
| **Expected Stats** | activeGroups (own org), totalCollections (own org), activeMembers (own org), pendingDues (own org) |
| **API** | `GET /api/dashboard` |

### TC-DASH-002: SUPER_ADMIN Dashboard Stats
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin views system-wide dashboard |
| **Expected Stats** | All organisations combined |

### TC-DASH-003: Recent Collections List
| Field | Value |
|-------|-------|
| **Scenario** | View 5 most recent collections |
| **Expected** | Sorted by createdAt desc, limit 5 |

### TC-DASH-004: Pending Dues List
| Field | Value |
|-------|-------|
| **Scenario** | View top 5 pending dues |
| **Expected** | Subscriptions with pendingAmount > 0, sorted by amount desc |

### TC-DASH-005: Empty Dashboard (New Org)
| Field | Value |
|-------|-------|
| **Scenario** | Dashboard for org with no data |
| **Expected** | All stats = 0, empty lists |

---

## 11. Reports Test Cases

### TC-REP-001: Collection Trends (6 Months)
| Field | Value |
|-------|-------|
| **Scenario** | View monthly collection trends |
| **Expected** | Array with month names and amounts, last 6 months |
| **API** | `GET /api/reports` |

### TC-REP-002: Member Distribution by Group
| Field | Value |
|-------|-------|
| **Scenario** | View member count per group |
| **Expected** | `{ name: "Group Name", value: count }` |

### TC-REP-003: Payment Mode Statistics
| Field | Value |
|-------|-------|
| **Scenario** | View payment breakdown by mode |
| **Expected** | `{ name: "CASH/UPI/etc", value: totalAmount }` |

### TC-REP-004: Recent Transactions (10)
| Field | Value |
|-------|-------|
| **Scenario** | View last 10 transactions |
| **Expected** | Collections sorted by date, limit 10 |

### TC-REP-005: Group Performance
| Field | Value |
|-------|-------|
| **Scenario** | Top 5 groups by collection amount |
| **Expected** | `{ name: "Group Name", value: totalCollected }` |

### TC-REP-006: ORG_ADMIN Report Scoping
| Field | Value |
|-------|-------|
| **Scenario** | Reports show only own org data |
| **Expected** | All report sections filtered by organisation |

---

## 12. Role-Based Access Control Test Cases

### TC-RBAC-001: ORG_ADMIN Cannot Create Organisations
| Field | Value |
|-------|-------|
| **API** | `POST /api/organisations` |
| **User** | ORG_ADMIN |
| **Expected** | 403 Forbidden |

### TC-RBAC-002: ORG_ADMIN Cannot View All Organisations
| Field | Value |
|-------|-------|
| **API** | `GET /api/organisations` |
| **User** | ORG_ADMIN |
| **Expected** | 403 Forbidden |

### TC-RBAC-003: ORG_ADMIN Cannot Create Users
| Field | Value |
|-------|-------|
| **API** | `POST /api/users` |
| **User** | ORG_ADMIN |
| **Expected** | 403 Forbidden |

### TC-RBAC-004: ORG_ADMIN Cannot View All Users
| Field | Value |
|-------|-------|
| **API** | `GET /api/users` |
| **User** | ORG_ADMIN |
| **Expected** | 403 Forbidden |

### TC-RBAC-005: ORG_ADMIN Groups Auto-Filtered
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin fetches groups |
| **Expected** | Query automatically includes organisationId filter |

### TC-RBAC-006: ORG_ADMIN Members Auto-Filtered
| Field | Value |
|-------|-------|
| **Scenario** | Org Admin fetches members |
| **Expected** | Only org-specific members returned |

### TC-RBAC-007: ORG_ADMIN Collections Scoped by Org Groups
| Field | Value |
|-------|-------|
| **Scenario** | Collections filtered through org's groups |
| **Implementation** | Find org groups first, then filter collections by those group IDs |

### TC-RBAC-008: ORG_ADMIN Winner Creation Cross-Org Check
| Field | Value |
|-------|-------|
| **Scenario** | Try to create winner for another org's group |
| **Expected** | 403: "Group does not belong to your organisation" |

### TC-RBAC-009: Data Isolation Between Organisations
| Field | Value |
|-------|-------|
| **Scenario** | Org A admin cannot see Org B's data |
| **Expected** | Complete data isolation |

### TC-RBAC-010: SUPER_ADMIN Full Access
| Field | Value |
|-------|-------|
| **Scenario** | Super Admin can access all resources |
| **Expected** | No organisation filtering (unless explicitly requested) |

---

## Summary: Collection Factor Logic Table

| Group Frequency | Collection Pattern | Collection Factor | Amount Per Collection |
|-----------------|-------------------|-------------------|----------------------|
| MONTHLY | MONTHLY | 1 | Full contribution |
| MONTHLY | WEEKLY | 4 | Contribution / 4 |
| MONTHLY | DAILY | 30 | Contribution / 30 |
| WEEKLY | WEEKLY | 1 | Full contribution |
| WEEKLY | DAILY | 7 | Contribution / 7 |
| DAILY | DAILY | 1 | Full contribution |

---

## Test Data Examples

### Example Organisation
```json
{
  "name": "Sunshine Chits Pvt Ltd",
  "code": "SUN01",
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "address": "123 Main Street, Kerala",
  "phone": "9876543210",
  "email": "admin@sunshinechits.com",
  "status": "ACTIVE"
}
```

### Example Chit Group
```json
{
  "groupName": "Sunshine 1 Lakh Monthly",
  "frequency": "MONTHLY",
  "contributionAmount": 5000,
  "totalUnits": 20,
  "totalPeriods": 20,
  "commissionValue": 5000,
  "startDate": "2026-01-01",
  "status": "ACTIVE",
  "currentPeriod": 1
}
```

### Example Member
```json
{
  "name": "Raju Kumar",
  "phone": "9876543210",
  "email": "raju@email.com",
  "address": "45 Temple Road, Trivandrum",
  "status": "ACTIVE",
  "kycVerified": true
}
```

### Example Subscription
```json
{
  "memberId": "xxx",
  "groupId": "yyy",
  "units": 1,
  "collectionPattern": "DAILY",
  "collectionFactor": 30,
  "totalDue": 100000,
  "totalCollected": 0,
  "pendingAmount": 100000,
  "status": "ACTIVE"
}
```

### Example Collection
```json
{
  "groupMemberId": "xxx",
  "groupId": "yyy",
  "memberId": "zzz",
  "basePeriodNumber": 1,
  "collectionSequence": 1,
  "periodDate": "2026-01-01",
  "amountDue": 166.67,
  "amountPaid": 170,
  "paymentMode": "CASH",
  "status": "PAID"
}
```

---

## API Endpoints Summary

| Endpoint | Methods | SUPER_ADMIN | ORG_ADMIN |
|----------|---------|-------------|-----------|
| `/api/auth/login` | POST | ✅ | ✅ |
| `/api/auth/logout` | POST | ✅ | ✅ |
| `/api/auth/me` | GET | ✅ | ✅ |
| `/api/organisations` | GET, POST | ✅ | ❌ |
| `/api/organisations/[id]` | GET, PUT, DELETE | ✅ | ❌ |
| `/api/users` | GET, POST | ✅ | ❌ |
| `/api/users/[id]` | GET, PUT, DELETE | ✅ | ❌ |
| `/api/members` | GET, POST | ✅ | ✅ (org-scoped) |
| `/api/members/[id]` | GET, PUT | ✅ | ✅ (org-scoped) |
| `/api/chitgroups` | GET, POST | ✅ | ✅ (org-scoped) |
| `/api/chitgroups/[id]` | GET, PUT, DELETE | ✅ | ✅ (org-scoped) |
| `/api/chitgroups/[id]/clone` | POST | ✅ | ✅ (org-scoped) |
| `/api/groupmembers` | GET, POST | ✅ | ✅ (org-scoped) |
| `/api/collections` | GET, POST | ✅ | ✅ (org-scoped) |
| `/api/winners` | GET, POST | ✅ | ✅ (org-scoped) |
| `/api/dashboard` | GET | ✅ (all) | ✅ (org) |
| `/api/reports` | GET | ✅ (all) | ✅ (org) |

---

*Document Version: 1.0*  
*Last Updated: 2026-02-08*
