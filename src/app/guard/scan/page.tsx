import { DashboardFrame, SectionHeading } from "@/components/dashboard-ui";
import { ScannerPanel } from "@/components/client-ui";
import { requireSession } from "@/lib/auth";
import { getGuardDashboard } from "@/lib/data";

export default async function GuardScanPage() {
  const session = await requireSession("guard");
  const { activeOutpasses } = await getGuardDashboard(session);

  return (
    <DashboardFrame session={session} eyebrow="Dedicated scan mode" title="QR Exit And Entry Station">
      <section className="stack-sm">
        <SectionHeading title="Scan Desk" kicker="Camera, upload, or token validation" />
        <ScannerPanel activeOutpasses={activeOutpasses} />
      </section>
    </DashboardFrame>
  );
}
