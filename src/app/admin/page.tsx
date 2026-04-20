import Link from "next/link";
import {
  DashboardFrame,
  OutpassCard,
  SectionHeading,
  SummaryGrid,
} from "@/components/dashboard-ui";
import { ConfigForm, UserStatusToggle } from "@/components/client-ui";
import { requireSession } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/data";

export default async function AdminPage() {
  const session = await requireSession("admin");
  const { outpasses, users, config, gateLogsById, summary } = await getAdminDashboard(session);

  return (
    <DashboardFrame session={session} eyebrow="Admin control room" title="Rules, People, Reports">
      <SummaryGrid summary={summary} />

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

      <section className="stack-sm">
        <SectionHeading title="Manage Users" kicker="Activate or deactivate accounts" />
        <div className="users-grid">
          {users.map((user) => (
            <article className="outpass-card" key={user.uid}>
              <div className="outpass-head">
                <div>
                  <p className="micro-copy">
                    {user.role === "pending" && user.requestedRole
                      ? `pending ${user.requestedRole} request`
                      : user.role}
                  </p>
                  <h3>{user.name}</h3>
                </div>
                <span
                  className={`status-badge ${
                    user.role === "pending"
                      ? "warning"
                      : user.isActive
                        ? "success"
                        : "muted"
                  }`}
                >
                  {user.role === "pending"
                    ? "Pending Approval"
                    : user.isActive
                      ? "Active"
                      : "Inactive"}
                </span>
              </div>
              <div className="detail-grid">
                <div>
                  <p className="micro-copy">Email</p>
                  <p>{user.email}</p>
                </div>
                <div>
                  <p className="micro-copy">Department</p>
                  <p>{user.department}</p>
                </div>
                <div>
                  <p className="micro-copy">Block</p>
                  <p>{user.hostelBlock}</p>
                </div>
                {user.requestedRole ? (
                  <div>
                    <p className="micro-copy">Requested Role</p>
                    <p>{user.requestedRole}</p>
                  </div>
                ) : null}
              </div>
              <UserStatusToggle user={user} />
            </article>
          ))}
        </div>
      </section>

      <section className="stack-sm">
        <SectionHeading title="Recent Activity" kicker="Latest outpasses and gate state" />
        <div className="cards-grid">
          {outpasses.map((outpass) => {
            const log = gateLogsById.get(outpass.id);
            return (
              <OutpassCard
                key={outpass.id}
                outpass={outpass}
                footer={
                  <div className="detail-grid">
                    <div>
                      <p className="micro-copy">Exit Scan</p>
                      <p>{log?.exitAt ? new Date(log.exitAt).toLocaleString() : "Not scanned"}</p>
                    </div>
                    <div>
                      <p className="micro-copy">Return Scan</p>
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
