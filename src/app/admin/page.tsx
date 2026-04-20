import Link from "next/link";
import { AdminControlCenter } from "@/components/admin-ui";
import {
  DashboardFrame,
  SectionHeading,
  SummaryGrid,
} from "@/components/dashboard-ui";
import { ConfigForm } from "@/components/client-ui";
import { requireSession } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/data";

export default async function AdminPage() {
  const session = await requireSession("admin");
  const { outpasses, users, config, gateLogs, summary } = await getAdminDashboard(session);

  return (
    <DashboardFrame session={session} eyebrow="Admin control room" title="Discipline, People, Gate Intelligence">
      <SummaryGrid summary={summary} />

      <AdminControlCenter users={users} outpasses={outpasses} gateLogs={gateLogs} config={config} />

      <section className="dashboard-panel-grid">
        <div className="section-grid-main stack-sm">
          <SectionHeading title="Campus Rules" kicker="Configurable system policy" />
          <ConfigForm config={config} />
        </div>
        <div className="section-grid-side stack-sm">
          <SectionHeading
            title="Exports"
            kicker="Daily report outputs"
            action={<Link href="/admin/reports" className="text-link">Open reports</Link>}
          />
          <article className="hero-card">
            <div className="report-actions">
              <a className="action-button" href="/api/reports?format=csv">
                Download CSV
              </a>
              <a className="ghost-button" href="/api/reports?format=pdf">
                Download PDF
              </a>
            </div>
          </article>
        </div>
      </section>
    </DashboardFrame>
  );
}
