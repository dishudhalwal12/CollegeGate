import { NextRequest } from "next/server";
import { assertApiRole, withApiError } from "@/lib/auth";
import { buildPdfReport, buildReportPayload } from "@/lib/data";
import { buildCsv } from "@/lib/collegegate";

export async function GET(request: NextRequest) {
  try {
    await assertApiRole(request, "admin");
    const records = await buildReportPayload();
    const format = request.nextUrl.searchParams.get("format") ?? "csv";

    if (format === "pdf") {
      const pdfBuffer = await buildPdfReport(records);
      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="collegegate-report.pdf"',
        },
      });
    }

    const csv = buildCsv(records);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="collegegate-report.csv"',
      },
    });
  } catch (error) {
    return withApiError(error);
  }
}
