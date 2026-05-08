# CollegeGate Handbook

## 1. Project Overview

**CollegeGate** is a hostel outpass and gate-management web application built for a campus workflow where students request leave, wardens approve or reject it, guards verify movement at the gate, and admins oversee users, rules, and reports.

The main goal of the system is to replace paper registers, phone calls, and informal approvals with a single digital flow that is easier to track, faster to verify, and more transparent for everyone involved.

This repository is focused on the **frontend experience and app workflow**, but it is tightly connected to Firebase for authentication, database storage, and protected data access.

---

## 2. What Problem This Project Solves

Before CollegeGate, the outpass process depended on manual registers and disconnected communication. That created several common issues:

- Students had no clean, single place to request an outpass.
- Wardens had no real-time visibility into requests and student history.
- Guards could not quickly verify whether a pass was actually approved.
- Late return tracking was hard to enforce.
- Admins had limited reporting and oversight.

CollegeGate turns that into a **digital chain of trust**:

1. Student submits a request.
2. Warden reviews and decides.
3. Approved pass becomes QR-readable.
4. Guard scans to mark exit and return.
5. Admin can monitor activity and generate reports.

---

## 3. Front-End Tech Stack

### Core framework
- **Next.js**
  - Main app framework.
  - Used for routing, page structure, server-side session checks, and dashboard rendering.
  - The app uses the **Next.js App Router** pattern (`src/app/...`).

### Language
- **TypeScript**
  - Used for most of the codebase.
  - Gives stronger typing for sessions, dashboard data, status logic, and UI components.

### Styling
- **CSS / CSS3**
  - Custom visual styling layered on top of the layout structure.
  - Used for the landing page, dashboard shells, status badges, scanner overlay, cards, and responsive behavior.

### UI / Icon library
- **lucide-react**
  - Used for icons throughout the landing page and dashboards.
  - Examples include QR, shield, chart, and navigation-style icons.

### Fonts
- **next/font/google**
  - The app uses Google fonts through Next.js.
  - The layout loads:
    - `Cormorant_Garamond` for display headings.
    - `Manrope` for body text.

### Authentication and data backend
- **Firebase Auth**
- **Firestore**
- **Firebase Admin SDK** for seed or privileged workflows

### Routing and navigation
- Built-in **Next.js routing** is used instead of a separate client router.
- Role-based pages live under routes like:
  - `/student`
  - `/warden`
  - `/guard`
  - `/admin`
  - `/login`

### Supporting utilities
- Server-side session helpers
- Firestore-backed dashboard data helpers
- Role and status formatting helpers
- QR / scanner UI components

---

## 4. High-Level Architecture

CollegeGate is organized around three layers:

### 4.1 Public marketing / introduction layer
This is the landing page at `/`.
It explains:
- the problem statement,
- the workflow,
- the roles,
- the QR pass concept,
- and the admin reporting side.

### 4.2 Protected role dashboards
After login, users are redirected to the correct dashboard based on their role.
These dashboards are protected with session checks so only the correct role can access the correct page.

### 4.3 Firebase-backed app logic
The app stores and reads data from Firebase.
That includes:
- user identity and role,
- outpass requests,
- gate logs,
- approval state,
- config and reporting data.

---

## 5. Main User Roles

### Student
Students create and submit outpass requests.
They provide details such as:
- destination,
- reason,
- expected departure time,
- expected return time,
- and priority / emergency information.

### Warden
Wardens review pending requests, inspect the context, and approve or reject them with remarks.
They are the main approval authority.

### Guard
Guards use the gate interface to scan QR passes, confirm exits, and mark returns.
The guard dashboard also emphasizes active movement and overdue monitoring.

### Admin
Admins manage the broader system:
- user control,
- rules and configuration,
- oversight of live movement,
- and report generation.

---

## 6. How the Core Feature Flow Works

### 6.1 Landing page flow
The home page presents the system story in a polished, presentation-style layout.
It shows:
- the pain points of the old process,
- the new live workflow,
- the four roles,
- the QR pass concept,
- and the reporting/control room.

It is designed to be understandable even to someone who has never used the app before.

### 6.2 Authentication and login flow
The login page uses Firebase-backed sign-in.
Important behavior:
- If a user is already signed in, they are redirected to their role dashboard.
- New users can register and immediately enter the correct workflow.
- Admin signups can be treated differently from normal role signups.

### 6.3 Student request flow
A student submits an outpass request.
That request becomes the source record for the rest of the workflow.

Typical fields include:
- student identity,
- hostel block / assignment,
- destination,
- reason,
- departure time,
- expected return time.

Once submitted, the request appears in the warden’s queue.

### 6.4 Warden approval flow
The warden dashboard is built around reviewing pending requests.
Wardens can:
- inspect request history,
- make a decision,
- add remarks,
- approve or reject,
- and push the request into the next stage.

Approved requests become operational passes.

### 6.5 QR pass flow
Once approved, the request transforms into an **outpass card** or QR-enabled pass.
This pass acts as the proof of approval at the gate.

The pass is tied to:
- a single student,
- a single request,
- and a verification token/QR identity.

The gate side uses this pass to confirm movement without manual calls.

### 6.6 Guard scanning flow
The guard dashboard centers on live scanning.
A guard can:
- scan the QR pass,
- mark exit when the student leaves,
- mark entry when the student returns,
- and view gate notes / movement visibility.

The workflow is designed so that the same pass can be used twice:
- first for exit,
- then for return.

### 6.7 Overdue logic
The system derives overdue status automatically when an active pass crosses its expected return time.
That means:
- guard sees late-return alerts,
- warden sees the status clearly,
- and the system does not rely on manual follow-up.

### 6.8 Admin reporting flow
Admins can review overall movement, active requests, and completed passes.
The app highlights reporting and export-oriented oversight such as:
- daily summaries,
- live counts,
- late return flags,
- and CSV/PDF-style reporting support.

---

## 7. Pages and Routes

### `/`
Landing page.
Explains the project visually and narratively.

### `/login`
Authentication entry point.
Handles access to role-specific workflows.

### `/student`
Student dashboard.
For submitting and tracking outpass requests.

### `/warden`
Warden dashboard.
For reviewing and acting on student requests.

### `/guard`
Guard dashboard.
For live scanning and gate confirmation.

### `/guard/scan`
Full-screen scanner mode for gate-side use.

### `/admin`
Admin dashboard.
For system oversight and control.

---

## 8. Important UI Building Blocks

### DashboardFrame
A shared dashboard wrapper that provides:
- a role-specific header,
- signed-in user information,
- quick links,
- and logout access.

### SummaryGrid
Shows high-level counts such as:
- total requests,
- pending review,
- active outside,
- completed.

### OutpassCard
Used to display a single outpass in a readable format.
It includes:
- student name,
- block,
- status badge,
- timing information,
- and gate-related state.

### StatusBadge
Provides a tone-based visual label for status.
It also marks overdue passes as a late-return flag.

### ScannerPanel
Used in the guard workflow for scanning QR passes.
This is one of the most important client-side interaction areas.

### LoginForm
The role-based sign-in / registration form.

### DecisionForm
Used by wardens to approve or reject requests.

### ConfigForm
Used for admin/system configuration workflows.

### AdminControlCenter
The admin oversight panel.

---

## 9. Session and Access Control

Access control is handled on the server side.
The project uses session checks so that:

- signed-out users are redirected to `/login`.
- signed-in users are sent to the correct role dashboard.
- users cannot open a dashboard for a role they do not have.

This is important because the app is not just a UI demo; it is a role-protected workflow system.

The code uses helper logic such as:
- `requireSession(...)`
- `getServerSession()`
- `assertApiRole(...)`
- cookie-based session persistence

This ensures the app behaves like a controlled internal campus system rather than a public page.

---

## 10. Firebase Usage

### Authentication
Firebase Authentication is used for sign-in and session identity.

### Firestore
Firestore stores the app data, including:
- users,
- requests,
- approvals,
- gate logs,
- configuration.

### Security model
The repo notes that normal auth and protected routes use verified Firebase ID tokens plus Firestore security rules.

### Admin SDK
Still needed for:
- seeding demo data,
- and any future privileged server-side workflows.

---

## 11. Configuration and Environment Setup

The repo supports both `NEXT_PUBLIC_...` and older `VITE_...` style environment names for Firebase values.

Important env values include:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

And for admin/server use:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

There is also a fallback public Firebase config in the repository for the current project.

---

## 12. Design and Visual Style

The UI is not a plain CRUD screen. It is styled as a polished campus product presentation.

Visual characteristics:
- bold headline typography,
- card-based layout,
- smooth section navigation,
- mobile-first dashboard design,
- role-colored status badges,
- QR / gate themed icons,
- scanner-focused guard layout.

Fonts also help give the app a distinct identity:
- display font for headings,
- modern sans-serif for interface text.

---

## 13. Main Project Strengths

### 13.1 Clear role separation
Each role has its own workflow and dashboard.

### 13.2 Real-time operational flow
The system is built around current request and gate status, not static records.

### 13.3 Practical gate verification
The QR pass removes manual verification friction.

### 13.4 Automatic overdue tracking
Late returns are derived from time logic rather than manual memory.

### 13.5 Good presentation value
The project is easy to explain in front of faculty because the workflow is intuitive:
student → warden → guard → admin.

---

## 14. What You Should Say to Professors

If you need to explain the project clearly, say it like this:

> CollegeGate is a role-based hostel outpass management system built with Next.js, TypeScript, and Firebase. It replaces manual paper registers with a digital request-and-approval workflow. Students submit outpass requests, wardens approve or reject them, guards verify them using QR scanning at the gate, and admins monitor the whole system through dashboards and reports. The system also automatically tracks active exits and overdue returns.

That is the simplest high-level explanation.

If they ask for technical detail, add:

> The frontend is built with Next.js App Router, custom CSS, lucide-react icons, and shared dashboard components. Firebase Authentication handles login and Firestore stores the workflow data. Role-based access is enforced with server-side session checks so that each user only sees their own dashboard.

---

## 15. Setup Summary

To run the project locally:
1. Install dependencies.
2. Create `.env` from `.env.example`.
3. Fill Firebase values.
4. Deploy Firestore rules.
5. Optionally seed demo data.
6. Start the development server.

---

## 16. Validation and Quality Checks

The repository includes standard validation commands:
- lint
- type checking
- tests
- build

This helps ensure the app stays stable across dashboard and workflow changes.

---

## 17. Final Note

CollegeGate is best understood as a **campus movement control system** rather than only an outpass form app. Its value comes from the complete chain:

- request creation,
- approval,
- QR pass generation,
- gate scanning,
- overdue detection,
- and admin oversight.

That end-to-end flow is the core idea behind the project.
