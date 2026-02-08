# Organization Logic & Workflow Documentation

This document outlines the core business logic, data structures, and workflows for the Organization management system.

## 1. Organization Structure

The system is designed around **Organisations** which are independent entities.
- **Key Attributes**: Name, Code (unique), GST, PAN, Address.
- **Scope**: All data (Groups, Members, Collections) is scoped to an Organisation.
- **Roles**:
    - **Super Admin**: Can manage multiple organisations.
    - **Org Admin**: Can only manage their own organisation's data.

### Example: Organization Setup
> **Scenario**: "Sunshine Chits" wants to onboard.
> - **Name**: Sunshine Chits Pvt Ltd
> - **Code**: SUN01 (Used for prefixing IDs or refs)
> - **Admin**: org@sunshine.com

---

## 2. Chit Group Logic

A **Chit Group** is the core financial unit. It defines the timeline, value, and frequency of the chit fund.

### Core Logic
1.  **Frequency**: Groups can be `DAILY`, `WEEKLY`, or `MONTHLY`.
2.  **Contribution**: The amount each member has to pay per "unit" per period.
3.  **Total Units**: The maximum number of subscriber units (e.g., 20, 40).
4.  **Total Periods**: The duration of the chit.
5.  **Pot Value** (Total Value): Calculated as `Contribution Amount * Total Units`.
6.  **Commission**: The fixed amount or percentage taken by the content/foreman per draw.

### Logic: Cycle & Periods
- A group starts at `Period 1`.
- It increments to `Total Periods`.
- `StartDate` determines the first due date.

### Example: Monthly Group
> **Scenario**: 1 Lakh Chit, 20 Members, 20 Months.
> - **Frequency**: `MONTHLY`
> - **Contribution**: ₹5,000
> - **Total Units**: 20
> - **Total Periods**: 20
> - **Pot Value**: ₹5,000 * 20 = ₹1,00,000
> - **Commission**: ₹5,000 (Fixed)

---

## 3. Group Member (Subscription) Logic

Members subscribe to a Group. A single Member can have multiple subscriptions (units) in the same or different groups.

### Core Logic
1.  **Units**: A member can hold `0.5`, `1`, `2` etc. units.
    - *Logic*: `Total Due = Group Contribution * Units * Total Periods`.
2.  **Collection Pattern**: How the member *prefers* to pay.
    - Examples: `DAILY`, `WEEKLY`, `MONTHLY`.
3.  **Collection Factor**: Used to break down the "Period Amount" into smaller payable chunks.
    - **Formula**: `Amount Due Per Collection = (Contribution * Units) / Collection Factor`.

### Logic: Collection Factor Calculation
- **Monthly Group, Daily Collection**: Factor = 30. (Pay ~1/30th daily)
- **Monthly Group, Weekly Collection**: Factor = 4. (Pay ~1/4th weekly)
- **Monthly Group, Monthly Collection**: Factor = 1. (Pay full amount once)
- **Weekly Group, Daily Collection**: Factor = 7.

### Example: Daily Payer in Monthly Group
> **Scenario**: Member "Raju" joins "Sunshine 1L Group" with 1 Unit. He wants to pay Daily.
> - **Group Contribution**: ₹5,000 (Monthly)
> - **Collection Pattern**: `DAILY`
> - **Collection Factor**: 30
> - **Daily Payable**: ₹5,000 / 30 = **₹166.66** (approx)
> - **Total Due**: ₹5,000 * 20 Months = ₹1,00,000.

---

## 4. Collection Logic

Recording payments from members.

### Core Logic
1.  **Sequence Validation**:
    - Each "Period" (e.g., Period 1) is strictly divided into `Collection Factor` number of payments.
    - If Factor is 30, the system tracks Collection 1 to 30 for Period 1.
    - *Restriction*: Cannot collect more than the Factor count for a specific Base Period.
2.  **Amount Allocation**:
    - Payments reduce the `Pending Amount`.
    - Payments increase the `Total Collected`.
3.  **Status**: `PAID` upon entry.

### workflow
1.  **Agent Selects**: Member + Group.
2.  **System Checks**:
    - Current Base Period (e.g., Period 1).
    - Existing collections count for Period 1.
    - Calculates `Sequence = Count + 1`.
3.  **Validation**: Is `Sequence <= Factor`?
4.  **Record**: Saves date, amount, mode (Cash/UPI).

### Example: Recording Collection
> **Member**: Raju (Daily Payer, Factor 30).
> **Current Month**: 1.
> **Action**: Agent collects ₹170 on Day 1.
> - **Base Period**: 1
> - **Sequence**: 1 (First payment of the month)
> - **Status**: Success.
> - **Updates**:
>   - Subscription `Total Collected` += 170
>   - Subscription `Pending Amount` -= 170

---

## 5. Pending Amount Logic

There are two distinct types of "Pending" calculations in the system.

### A. Total Pending (Outstanding)
The total amount remaining to be paid for the *entire duration* of the chit.
- **Formula**: `Total Due (Initial) - Total Collected (So far)`
- **Usage**: Shows long-term liability.
- **Closing Condition**: When `Total Pending <= 0`, Subscription Status -> `CLOSED`.

### B. Current Overdue (Dynamic)
The amount that *should have been paid* by today, compared to what *has been paid*.
- **Formula**:
  ```
  Expected Payment = Current Period * (Contribution Amount * Units)
  Overdue = Max(0, Expected Payment - Total Collected)
  ```
- **Usage**: Shows immediate arrears. Used for "Defaulter" lists.

### Example: Logic Calculation
> **Scenario**:
> - Group: Monthly, Contribution ₹5,000.
> - Current Status: Group is in **Month 3**.
> - Member: Paid exactly ₹9,000 so far.
>
> **1. Total Pending Calculation:**
> - Total Due (20 Months) = ₹1,00,000
> - Total Pending = 1,00,000 - 9,000 = **₹91,000**
>
> **2. Current Overdue Calculation:**
> - Expected by Month 3 = 3 * ₹5,000 = ₹15,000
> - Actual Collected = ₹9,000
> - Overdue = 15,000 - 9,000 = **₹6,000**
> - *Status*: **Defaulter** (Needs to pay ₹6k immediately).

---

## 6. Draw (Winner) Logic

Selecting a winner for the current period.

### Core Logic
1.  **Eligibility**: Member must be active and ideally non-defaulted (business rule).
2.  **Selection Methods**:
    - **Lottery**: Random selection (usually for full-pot periods).
    - **Auction (Reverse Bidding)**: Members bid to forgo a portion of the prize. The lowest bidder (highest discount) wins.
3.  **Prize Calculation**:
    - `Pot Value` - `Commission` - `Auction Discount` (if any).
    - *Note*: In many systems, "Dividend" is distributed to other members from the auction discount, reducing their next pay. (Current Implementation focuses on identifying the winner and prize).

### Workflow
1.  **Period End**: Admin initiates draw for `Period X`.
2.  **Input**:
    - Winner Member ID.
    - Winning Bid/Discount (if Auction).
3.  **Creation**:
    - Records `Winner` entry.
    - Sets `Payout Status` to `PENDING`.
4.  **Payout**:
    - Admin marks as `PAID` when cash/transfer is done.

### Example: Auction Draw
> **Group**: 1 Lakh Pot. Commission ₹5,000.
> **Scenario**: 3 Members bid.
> - Member A bids ₹10,000 discount.
> - Member B bids ₹12,000 discount.
> - **Member B Wins**.
>
> **Calculation**:
> - **Gross Prize**: ₹1,00,000
> - **Deductions**: ₹5,000 (Comm) + ₹12,000 (Bid) = ₹17,000.
> - **Net Payable to Winner**: ₹83,000.
> - **Dividend**: The ₹12,000 bid amount is often distributed to reduce the next month's contribution for all 20 members (₹12,000 / 20 = ₹600 reduction). *[This dividend logic is a common extension]*
