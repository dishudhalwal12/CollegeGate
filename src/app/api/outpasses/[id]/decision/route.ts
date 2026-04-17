import { NextRequest, NextResponse } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { decideOutpass } from "@/lib/data";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await assertApiRole(request, ["warden", "admin"]);
    const body = await request.json();
    const { id } = await context.params;
    await decideOutpass(session, id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return withApiError(error);
  }
}
