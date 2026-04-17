import { NextRequest, NextResponse } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { updateUserStatus } from "@/lib/data";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await assertApiRole(request, "admin");
    const body = (await request.json()) as { isActive?: boolean };
    const { id } = await context.params;

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean." },
        { status: 400 },
      );
    }

    await updateUserStatus(id, body.isActive);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return withApiError(error);
  }
}
