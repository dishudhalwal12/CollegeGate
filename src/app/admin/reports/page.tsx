import { DashboardFrame, OutpassCard, SectionHeading } from "@/components/dashboard-ui";
import { requireSession } from "@/lib/auth";
import { buildReportPayload } from "@/lib/data";

export default async function AdminReportsPage() {
  const session = await requireSession("admin");
  const records = await buildReportPayload(session);

  return (
    <DashboardFrame session={session} eyebrow="Admin report room" title="Download And Review">
      <section className="stack-sm">
        <SectionHeading title="Exports" kicker="CSV and PDF output" />
        <article className="hero-card">
          <div className="report-actions">
            <a className="action-button" href="/api/reports?format=csv">
              Export CSV
            </a>
            <a className="ghost-button" href="/api/reports?format=pdf">
              Export PDF
            </a>
          </div>
        </article>
      </section>

      <section className="stack-sm">
        <SectionHeading title="Preview Rows" kicker="Recent records heading into exports" />
        <div className="cards-grid">
          {records.slice(0, 12).map((record) => (
            <OutpassCard key={record.id} outpass={record} />
          ))}
        </div>
      </section>
    </DashboardFrame>
  );
}
