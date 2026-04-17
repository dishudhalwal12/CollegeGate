import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { type SessionUser, serializeUser, type UserRole } from "@/lib/collegegate";
import { requireAdminSdk } from "@/lib/firebase-admin";

export const SESSION_COOKIE = "collegegate_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5;

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

async function loadUserFromSession(sessionCookie: string): Promise<SessionUser | null> {
  try {
    const { adminAuth, adminDb } = requireAdminSdk("session validation");
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userSnapshot = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!userSnapshot.exists) {
      return null;
    }

    const profile = serializeUser(decodedToken.uid, userSnapshot.data() ?? {});

    if (!profile.isActive) {
      return null;
    }

    return profile;
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  return loadUserFromSession(sessionCookie);
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
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    throw new ApiError(401, "You need to sign in before continuing.");
  }

  const session = await loadUserFromSession(sessionCookie);

  if (!session) {
    throw new ApiError(401, "Your session expired. Please sign in again.");
  }

  const allowed = roles ? (Array.isArray(roles) ? roles : [roles]) : [];

  if (allowed.length > 0 && !allowed.includes(session.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.");
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
