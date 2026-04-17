import { NextRequest, NextResponse } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { createOutpass } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const session = await assertApiRole(request, "student");
    const body = await request.json();
    const outpass = await createOutpass(session, body);
    return NextResponse.json({ ok: true, outpassId: outpass.id });
  } catch (error) {
    return withApiError(error);
  }
}
