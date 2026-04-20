import Link from "next/link";
import { DashboardFrame, OutpassCard, SectionHeading, SummaryGrid } from "@/components/dashboard-ui";
import { ScannerPanel } from "@/components/client-ui";
import { requireSession } from "@/lib/auth";
import { getGuardDashboard } from "@/lib/data";

export default async function GuardPage() {
  const session = await requireSession("guard");
  const { activeOutpasses, gateLogsById, summary } = await getGuardDashboard(session);

  return (
    <DashboardFrame session={session} eyebrow="Guard gate interface" title="Scan And Confirm">
      <SummaryGrid summary={summary} />

      <section className="dashboard-panel-grid">
        <div className="section-grid-main stack-sm">
          <SectionHeading title="Live Scanner" kicker="Camera or manual token" />
          <ScannerPanel activeOutpasses={activeOutpasses} />
        </div>
        <div className="section-grid-side stack-sm">
          <SectionHeading
            title="Gate Notes"
            kicker="Movement visibility"
            action={<Link href="/guard/scan" className="text-link">Full-screen scanner</Link>}
          />
          <article className="hero-card">
            <p className="helper-copy">
              Use Exit when a student leaves campus and Entry when the same student returns with
              the same QR pass. Overdue flags stay visible until entry is confirmed.
            </p>
          </article>
        </div>
      </section>

      <section className="stack-sm">
        <SectionHeading
          title="Active And Ready Passes"
          kicker="Approved or exited status"
        />
        <div className="cards-grid">
          {activeOutpasses.map((outpass) => {
            const log = gateLogsById.get(outpass.id);
            return (
              <OutpassCard
                key={outpass.id}
                outpass={outpass}
                footer={
                  <div className="detail-grid">
                    <div>
                      <p className="micro-copy">Gate Exit</p>
                      <p>{log?.exitAt ? new Date(log.exitAt).toLocaleString() : "Awaiting scan"}</p>
                    </div>
                    <div>
                      <p className="micro-copy">Gate Return</p>
                      <p>{log?.returnAt ? new Date(log.returnAt).toLocaleString() : "Open"}</p>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </section>
    </DashboardFrame>
  );
}
