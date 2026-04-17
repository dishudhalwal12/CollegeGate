import { NextRequest, NextResponse } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { updateSystemConfig } from "@/lib/data";

export async function PATCH(request: NextRequest) {
  try {
    await assertApiRole(request, "admin");
    const body = await request.json();
    await updateSystemConfig(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return withApiError(error);
  }
}
