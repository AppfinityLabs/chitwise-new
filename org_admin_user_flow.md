# Org Admin User Flow Documentation

This document outlines the step-by-step user flows for the **Organization Admin** role in the chit fund management application.

## 1. Authentication Flow
**Goal**: Secure access to the organization dashboard.

1.  **Launch App**: User opens the mobile application.
2.  **Login Screen**:
    - **Input**: Email Address (`org@gmail.com`)
    - **Input**: Password (`123456`)
    - **Action**: Tap "Login" button.
3.  **Validation**:
    - *System checks credentials.*
    - *If Valid*: Redirect to **Dashboard**.
    - *If Invalid*: Display error message "Invalid credentials".

## 2. Dashboard Flow
**Goal**: Overview of organizational metrics and quick navigation.

1.  **View Dashboard**:
    - **Metrics Displayed**: Total Active Groups, Total Collections, Active Members, Pending Dues.
    - **Recent Activity**: List of latest transactions.
2.  **Navigation**:
    - User taps the **Menu/Hamburger icon** or uses the **Bottom Navigation Bar** to access specific modules:
        - Chit Groups
        - Members
        - Collections
        - Reports

## 3. Group Management Flow
**Goal**: Create and manage chit groups.

### A. View Groups
1.  **Navigate to Groups**: Tap "Groups" tab.
2.  **List View**:
    - System displays list of active groups.
    - Each item shows: Group Name, Start Date, Status.

### B. Create New Group
1.  **Initiate Creation**: Tap **"New Group" (FAB)** button.
2.  **Fill Form**:
    - **Group Name**: Enter text.
    - **Frequency**: Select from dropdown (Monthly/Weekly).
    - **Start Date**: Select date.
    - **Contribution Amount**: Enter numeric value.
    - **Total Units**: Enter numeric value.
    - **Commission**: Enter percentage/value.
3.  **Submit**: Tap "Create Group".
4.  **Confirmation**: System validates data and adds group. User is returned to Group List with success message.

## 4. Member Management Flow
**Goal**: Register new members and view details.

### A. View Members
1.  **Navigate to Members**: Tap "Members" tab.
2.  **List View**:
    - System displays list of members (Name, Phone).
    - Search bar available at top to filter by name.

### B. Add Member
1.  **Initiate Addition**: Tap **"Add Member" (FAB)** button.
2.  **Fill Form**:
    - **Full Name**: Enter text.
    - **Phone**: Enter mobile number.
    - **Email**: Enter email address.
    - **Address**: Enter text.
3.  **Enrollment (Optional)**: Select a Group to enroll them in immediately.
4.  **Submit**: Tap "Save".

## 5. Collections Flow
**Goal**: Record and view payments.

1.  **Navigate to Collections**: Tap "Collections" tab.
2.  **View History**: List of all past transactions sorted by date.
3.  **Record Payment** (If manual entry is supported):
    - Tap "Record Payment".
    - Select Member -> Select Group -> Enter Amount.
    - Submit.

## 6. Reports Flow
**Goal**: View financial performance.

1.  **Navigate to Reports**: Tap "Reports" tab.
2.  **View Analytics**:
    - Graphical representation of collections over time.
    - Key performance indicators (KPIs).
