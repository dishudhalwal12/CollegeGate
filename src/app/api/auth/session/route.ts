import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, withApiError } from "@/lib/auth";
import { serializeUser } from "@/lib/collegegate";
import { ensureDemoAccounts, getDemoProfileDefaults } from "@/lib/demo-users";
import { requireAdminSdk } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
    }

    const { adminAuth, adminDb } = requireAdminSdk("session creation");
    const decoded = await adminAuth.verifyIdToken(idToken);

    if (decoded.email && getDemoProfileDefaults(decoded.email)) {
      await ensureDemoAccounts(adminAuth, adminDb);
    }

    const userRef = adminDb.collection("users").doc(decoded.uid);
    let userSnapshot = await userRef.get();

    if (!userSnapshot.exists && decoded.email) {
      const defaults = getDemoProfileDefaults(decoded.email);

      if (defaults) {
        await userRef.set(
          {
            role: defaults.role,
            name: defaults.name,
            department: defaults.department,
            hostelBlock: defaults.hostelBlock,
            phone: defaults.phone,
            email: decoded.email,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          { merge: true },
        );

        userSnapshot = await userRef.get();
      }
    }

    if (!userSnapshot.exists) {
      return NextResponse.json(
        { error: "This account is not seeded in the users collection yet." },
        { status: 403 },
      );
    }

    const profile = serializeUser(decoded.uid, userSnapshot.data() ?? {});

    if (!profile.isActive) {
      return NextResponse.json(
        { error: "This account is currently inactive." },
        { status: 403 },
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: `/${profile.role}`,
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    return withApiError(error);
  }
}
