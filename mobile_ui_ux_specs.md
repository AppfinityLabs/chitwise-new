# Mobile UI/UX Guidelines & Specifications

This document provides visual guidelines and UX patterns for the mobile application development team, based on the existing web application's logic.

## 1. Design System

### Color Palette
*   **Primary Brand Color**: Deep Purple/Blue (Matches the main sidebar/header).
*   **Secondary Accent**: Bright Blue/Cyan (For active states and primary buttons).
*   **Background**: Light Gray (`#f4f6f8`) for the main content area to ensure readability.
*   **Surface**: Pure White (`#ffffff`) for Cards and Input fields.
*   **Text**: Dark Gray (`#333333`) for headings, Medium Gray (`#666666`) for body text.

### Typography
*   **Font Family**: Use a clean, modern Sans-Serif font (e.g., **Inter** or **Roboto**).
*   **Headings**: Bold, readable sizes (20sp+).
*   **Body**: Legible size (16sp) with good contrast.

## 2. Core UI Components

### Navigation
*   **Mobile Pattern**: Use a **Bottom Navigation Bar** instead of a sidebar.
    *   **Items**: Dashboard, Groups, Members, More.
    *   **Active State**: Highlighted with Primary Color.

### Lists & Cards
*   **Pattern**: Display data (Groups, Members) in **Cards** with shadow elevation.
*   **Interaction**: Entire card should be tappable to view details.
*   **Example**:
    > **Group Card**
    > *   **Header**: Group Name (Bold)
    > *   **Body**: Status (Badge), Start Date, Amount.
    > *   **Footer**: Action buttons (View, Edit).

### Forms
*   **Layout**: Single column vertical layout.
*   **Inputs**: Outlined text fields with floating labels.
*   **Validation**: Real-time validation feedbacks (Red border/text for errors).
*   **Actions**: "Save" or "Submit" buttons should be sticky at the bottom or clearly visible.

### Floating Action Buttons (FAB)
*   Use a **FAB** in the bottom-right corner for primary creation actions:
    *   `+` icon on Groups screen -> Create Group.
    *   `+` icon on Members screen -> Add Member.

## 3. Visual References (Screenshots)

### Dashboard
*Overview of stats and quick actions.*
![Dashboard](/Users/datahex/.gemini/antigravity/brain/fb7714e9-148f-44f5-bd59-ff4ee48ddfa5/dashboard_home_page_1769951860671.png)

### Group Management
*List of active groups.*
![Groups List](/Users/datahex/.gemini/antigravity/brain/fb7714e9-148f-44f5-bd59-ff4ee48ddfa5/chit_groups_page_1769952116025.png)

*Creation Form.*
![Create Group](/Users/datahex/.gemini/antigravity/brain/fb7714e9-148f-44f5-bd59-ff4ee48ddfa5/create_new_group_form_1769952298261.png)

### Members
*Directory of members.*
![Members List](/Users/datahex/.gemini/antigravity/brain/fb7714e9-148f-44f5-bd59-ff4ee48ddfa5/members_page_1769952339918.png)

### Collections
*Transaction history.*
![Collections](/Users/datahex/.gemini/antigravity/brain/fb7714e9-148f-44f5-bd59-ff4ee48ddfa5/collections_page_1769953566565.png)

### Reports
*Analytics dashboard.*
![Reports](/Users/datahex/.gemini/antigravity/brain/fb7714e9-148f-44f5-bd59-ff4ee48ddfa5/reports_page_final_1769953626524.png)
