# CollegeGate

CollegeGate is a hostel outpass management app built with Next.js and Firebase Auth/Firestore.

## Requirements

- Node.js 20+
- npm 10+
- A Firebase project with:
  - Email/Password sign-in enabled
  - Firestore enabled
  - A Firebase Admin service account

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env
```

3. Fill `.env` with your Firebase values.

Public client keys:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Server-side admin keys:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

You can also use `GOOGLE_APPLICATION_CREDENTIALS` instead of `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

If you paste the private key directly into `.env`, keep newline characters escaped as `\n`.

4. Seed demo data:

```bash
npm run seed
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

- Student: `student@collegegate.demo` / `CollegeGate@123`
- Warden: `warden@collegegate.demo` / `CollegeGate@123`
- Guard: `guard@collegegate.demo` / `CollegeGate@123`
- Admin: `admin@collegegate.demo` / `CollegeGate@123`

## Validation

Run the project checks with:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Notes

- `.env` is intentionally ignored and should be shared separately.
- The repository includes a built-in fallback public Firebase web config for the current CollegeGate Firebase project, but the server-side admin credentials are still required for login, session creation, Firestore writes, and seeding.
