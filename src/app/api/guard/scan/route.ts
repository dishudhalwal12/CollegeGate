import { NextRequest, NextResponse } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { scanOutpass } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const session = await assertApiRole(request, "guard");
    const body = await request.json();
    const result = await scanOutpass(session, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return withApiError(error);
  }
}
