import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  applySessionCookies,
  readUserProfileFromIdToken,
  withApiError,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { idToken, refreshToken } = (await request.json()) as {
      idToken?: string;
      refreshToken?: string;
    };

    if (!idToken) {
      throw new ApiError(400, "Missing idToken.");
    }

    const profile = await readUserProfileFromIdToken(idToken, refreshToken);

    if (!profile.isActive && profile.role !== "pending") {
      throw new ApiError(403, "This account is currently inactive.");
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: `/${profile.role}`,
    });

    applySessionCookies(response, profile.authToken, profile.refreshToken ?? refreshToken);
    return response;
  } catch (error) {
    return withApiError(error);
  }
}
