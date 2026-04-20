import { NextRequest, NextResponse } from "next/server";
import { ApiError, withApiError } from "@/lib/auth";
import { getDocument, setDocument } from "@/lib/firestore-rest";
import { verifyFirebaseIdToken } from "@/lib/firebase-session";
import { registerProfileSchema } from "@/lib/collegegate";
import {
  countActiveLocalAdmins,
  getLocalUser,
  shouldUseLocalStore,
  upsertLocalUser,
} from "@/lib/local-store";

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

    const timestamp = new Date().toISOString();
    const isBootstrapAdmin = input.role === "admin" && countActiveLocalAdmins() === 0;
    const needsApproval = input.role !== "student" && !isBootstrapAdmin;

    const userProfile = {
      name: input.name,
      email: input.email,
      role: isBootstrapAdmin ? "admin" : needsApproval ? "pending" : "student",
      department: input.department,
      hostelBlock: input.hostelBlock,
      phone: input.phone,
      isActive: !needsApproval,
      createdAt: timestamp,
      ...(needsApproval ? { requestedRole: input.role } : {}),
    };

    try {
      await setDocument(`users/${decoded.uid}`, userProfile, idToken);
    } catch (error) {
      if (!shouldUseLocalStore(error)) {
        throw error;
      }

      upsertLocalUser(decoded.uid, userProfile);
    }

    return NextResponse.json({
      ok: true,
      role: isBootstrapAdmin ? "admin" : needsApproval ? "pending" : "student",
      message: isBootstrapAdmin
        ? "Bootstrap admin account created."
        : needsApproval
        ? `Your ${input.role} access request has been submitted for approval.`
        : "Your student account is ready.",
    });
  } catch (error) {
    return withApiError(error);
  }
}
