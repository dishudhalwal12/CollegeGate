import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDocument } from "@/lib/firestore-rest";
import { refreshFirebaseIdToken, verifyFirebaseIdToken } from "@/lib/firebase-session";
import { serializeUser, type SessionUser, type UserRole } from "@/lib/collegegate";

export const ID_TOKEN_COOKIE = "collegegate_id_token";
export const REFRESH_TOKEN_COOKIE = "collegegate_refresh_token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5;

export type AuthSession = SessionUser & {
  authToken: string;
  refreshToken?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function toSentenceCase(input: string) {
  return input
    .replaceAll(/([A-Z])/g, " $1")
    .replaceAll(".", " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatZodError(error: ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      const label = path ? `${toSentenceCase(path)}: ` : "";
      return `${label}${issue.message}`;
    })
    .join(" ");
}

async function resolveVerifiedToken(idToken: string, refreshToken?: string) {
  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    return {
      token: idToken,
      decoded,
      refreshToken,
    };
  } catch (error) {
    if (refreshToken && error instanceof Error && error.name === "FirebaseIdTokenExpired") {
      const refreshed = await refreshFirebaseIdToken(refreshToken);
      const decoded = await verifyFirebaseIdToken(refreshed.idToken);

      return {
        token: refreshed.idToken,
        decoded,
        refreshToken: refreshed.refreshToken,
      };
    }

    throw error;
  }
}

async function loadUserFromSession(
  idToken: string,
  refreshToken?: string,
): Promise<AuthSession | null> {
  try {
    const resolved = await resolveVerifiedToken(idToken, refreshToken);
    const userSnapshot = await getDocument<Record<string, unknown>>(
      `users/${resolved.decoded.uid}`,
      resolved.token,
    );

    if (!userSnapshot) {
      return null;
    }

    const profile = serializeUser(resolved.decoded.uid, userSnapshot.data);

    if (!profile.isActive && profile.role !== "pending") {
      return null;
    }

    return {
      ...profile,
      authToken: resolved.token,
      refreshToken: resolved.refreshToken,
    };
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(ID_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!idToken) {
    return null;
  }

  return loadUserFromSession(idToken, refreshToken);
}

export async function requireSession(roles?: UserRole | UserRole[]) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = roles ? (Array.isArray(roles) ? roles : [roles]) : [];

  if (allowed.length > 0 && !allowed.includes(session.role)) {
    redirect(`/${session.role}`);
  }

  return session;
}

export async function assertApiRole(
  request: NextRequest,
  roles?: UserRole | UserRole[],
) {
  const idToken = request.cookies.get(ID_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!idToken) {
    throw new ApiError(401, "You need to sign in before continuing.");
  }

  const session = await loadUserFromSession(idToken, refreshToken);

  if (!session) {
    throw new ApiError(401, "Your session expired. Please sign in again.");
  }

  const allowed = roles ? (Array.isArray(roles) ? roles : [roles]) : [];

  if (allowed.length > 0 && !allowed.includes(session.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }

  return session;
}

export function applySessionCookies(
  response: NextResponse,
  idToken: string,
  refreshToken?: string,
) {
  response.cookies.set({
    name: ID_TOKEN_COOKIE,
    value: idToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  if (refreshToken) {
    response.cookies.set({
      name: REFRESH_TOKEN_COOKIE,
      value: refreshToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set({
    name: ID_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readUserProfileFromIdToken(
  idToken: string,
  refreshToken?: string,
) {
  const session = await loadUserFromSession(idToken, refreshToken);

  if (!session) {
    throw new ApiError(403, "This account does not have a CollegeGate profile yet.");
  }

  return session;
}

export function withApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
  }

  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error ? error.message : "Something unexpected went wrong.",
    },
    { status: 500 },
  );
}
