import { NextRequest, NextResponse } from "next/server";
import { ApiError, withApiError } from "@/lib/auth";
import { getDocument, setDocument } from "@/lib/firestore-rest";
import { verifyFirebaseIdToken } from "@/lib/firebase-session";
import { buildRegistrationProfile, registerProfileSchema } from "@/lib/collegegate";
import { getLocalUser, shouldUseLocalStore, upsertLocalUser } from "@/lib/local-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      idToken?: string;
      name?: string;
      email?: string;
      role?: string;
      department?: string;
      hostelBlock?: string;
      phone?: string;
    };
    const { idToken, ...profilePayload } = body;

    if (!idToken) {
      throw new ApiError(400, "Missing idToken.");
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const input = registerProfileSchema.parse({
      ...profilePayload,
      email: decoded.email || profilePayload.email,
    });

    if (decoded.email && decoded.email !== input.email) {
      throw new ApiError(400, "The signed-in Firebase account email does not match the form.");
    }

    let existingProfile: Record<string, unknown> | null = null;

    try {
      const firestoreProfile = await getDocument<Record<string, unknown>>(
        `users/${decoded.uid}`,
        idToken,
      );
      existingProfile = firestoreProfile?.data ?? null;
    } catch (error) {
      if (!shouldUseLocalStore(error)) {
        throw error;
      }
    }

    existingProfile ??= (getLocalUser(decoded.uid) as unknown as Record<string, unknown> | null);

    if (existingProfile) {
      throw new ApiError(409, "This Firebase account is already registered in CollegeGate.");
    }

    const registration = buildRegistrationProfile(input);

    try {
      await setDocument(`users/${decoded.uid}`, registration.userProfile, idToken);
    } catch (error) {
      if (!shouldUseLocalStore(error)) {
        throw error;
      }

      upsertLocalUser(decoded.uid, registration.userProfile);
    }

    return NextResponse.json({
      ok: true,
      role: registration.sessionRole,
      message: registration.message,
    });
  } catch (error) {
    return withApiError(error);
  }
}
