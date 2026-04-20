import { NextRequest, NextResponse } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { updateUserAccess } from "@/lib/data";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await assertApiRole(request, "admin");
    const body = await request.json();
    const { id } = await context.params;

    await updateUserAccess(session, id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return withApiError(error);
  }
}
