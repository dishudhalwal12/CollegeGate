import { DashboardFrame, SectionHeading } from "@/components/dashboard-ui";
import { requireSession } from "@/lib/auth";
import { roleLabel } from "@/lib/collegegate";

export default async function PendingApprovalPage() {
  const session = await requireSession("pending");
  const isAdminRequest = session.requestedRole === "admin";

  return (
    <DashboardFrame
      session={session}
      eyebrow="Access request received"
      title="Awaiting Approval"
    >
      <section className="stack-sm">
        <SectionHeading
          title="Registration Status"
          kicker={isAdminRequest ? "Admin approval required" : "Legacy pending access"}
        />
        <article className="hero-card">
          <p className="helper-copy">
            {isAdminRequest
              ? "Your admin account has been created and is waiting for an administrator to approve it."
              : "This pending access request is still waiting for an administrator to finish the older approval flow."}
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
