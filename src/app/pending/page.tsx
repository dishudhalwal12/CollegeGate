import { DashboardFrame, SectionHeading } from "@/components/dashboard-ui";
import { requireSession } from "@/lib/auth";
import { roleLabel } from "@/lib/collegegate";

export default async function PendingApprovalPage() {
  const session = await requireSession("pending");

  return (
    <DashboardFrame
      session={session}
      eyebrow="Access request received"
      title="Awaiting Approval"
    >
      <section className="stack-sm">
        <SectionHeading title="Registration Status" kicker="Production-safe onboarding" />
        <article className="hero-card">
          <p className="helper-copy">
            Your account has been created and is waiting for an administrator to approve your
            requested role.
          </p>
          <div className="detail-grid">
            <div>
              <p className="micro-copy">Requested access</p>
              <p>{session.requestedRole ? roleLabel(session.requestedRole) : "Pending assignment"}</p>
            </div>
            <div>
              <p className="micro-copy">Current status</p>
              <p>{session.isActive ? "Active" : "Waiting for approval"}</p>
            </div>
          </div>
        </article>
      </section>
    </DashboardFrame>
  );
}
