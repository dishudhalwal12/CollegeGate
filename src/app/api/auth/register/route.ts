import { NextRequest, NextResponse } from "next/server";
import { ApiError, withApiError } from "@/lib/auth";
import { getDocument, setDocument } from "@/lib/firestore-rest";
import { verifyFirebaseIdToken } from "@/lib/firebase-session";
import { registerProfileSchema } from "@/lib/collegegate";

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

    const existingProfile = await getDocument<Record<string, unknown>>(
      `users/${decoded.uid}`,
      idToken,
    );

    if (existingProfile) {
      throw new ApiError(409, "This Firebase account is already registered in CollegeGate.");
    }

    const timestamp = new Date().toISOString();
    const needsApproval = input.role !== "student";

    const userProfile = {
      name: input.name,
      email: input.email,
      role: needsApproval ? "pending" : "student",
      department: input.department,
      hostelBlock: input.hostelBlock,
      phone: input.phone,
      isActive: !needsApproval,
      createdAt: timestamp,
      ...(needsApproval ? { requestedRole: input.role } : {}),
    };

    await setDocument(`users/${decoded.uid}`, userProfile, idToken);

    return NextResponse.json({
      ok: true,
      role: needsApproval ? "pending" : "student",
      message: needsApproval
        ? `Your ${input.role} access request has been submitted for approval.`
        : "Your student account is ready.",
    });
  } catch (error) {
    return withApiError(error);
  }
}
