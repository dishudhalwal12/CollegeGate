import Link from "next/link";
import { InlineLink, DashboardFrame, OutpassCard, SectionHeading, SummaryGrid } from "@/components/dashboard-ui";
import { StudentRequestForm } from "@/components/client-ui";
import { requireSession } from "@/lib/auth";
import { formatDateTime, isOutpassOverdue } from "@/lib/collegegate";
import { getStudentDashboard } from "@/lib/data";

export default async function StudentPage() {
  const session = await requireSession("student");
  const { student, requests, config, summary } = await getStudentDashboard(session.uid);
  const activePass = requests.find(
    (request) => request.status === "approved" || request.status === "exited",
  );

  return (
    <DashboardFrame
      session={session}
      eyebrow="Student dashboard"
      title="Request, Track, Show"
    >
      <SummaryGrid summary={summary} />

      <section className="dashboard-panel-grid">
        <div className="section-grid-main stack-sm">
          <SectionHeading
            title="Submit a New Outpass"
            kicker="Quick request form"
          />
          <StudentRequestForm config={config} />
        </div>
        <div className="section-grid-side stack-sm">
          <SectionHeading title="Student Snapshot" kicker="Identity & live pass" />
          <article className="hero-card">
            <p className="micro-copy">Profile</p>
            <h2 className="card-title">{student.name}</h2>
            <p className="helper-copy">
              {student.department} • {student.hostelBlock}
            </p>
            <div className="detail-grid">
              <div>
                <p className="micro-copy">Warden</p>
                <p>{student.wardenName ?? "Not assigned"}</p>
              </div>
              <div>
                <p className="micro-copy">Phone</p>
                <p>{student.phone}</p>
              </div>
            </div>
            {activePass ? (
              <div className="stack-xs">
                <p className="micro-copy">Current active pass</p>
                <p className="helper-copy">
                  {activePass.destination} • Due {formatDateTime(activePass.expectedReturnAt)}
                </p>
                <Link className="action-button" href={`/student/pass/${activePass.id}`}>
                  Open QR Pass
                </Link>
              </div>
            ) : (
              <p className="helper-copy">No active QR pass right now.</p>
            )}
          </article>
        </div>
      </section>

      <section className="stack-sm">
        <SectionHeading
          title="Recent Requests"
          kicker="Your latest history"
          action={<InlineLink href="/student">Refresh board</InlineLink>}
        />
        <div className="cards-grid">
          {requests.map((outpass) => (
            <OutpassCard
              key={outpass.id}
              outpass={outpass}
              footer={
                outpass.qrToken && outpass.status !== "rejected" ? (
                  <Link className="text-link" href={`/student/pass/${outpass.id}`}>
                    View pass
                  </Link>
                ) : (
                  <p className="helper-copy">
                    {isOutpassOverdue(outpass)
                      ? "Late return flagged"
                      : "Waiting for next step"}
                  </p>
                )
              }
            />
          ))}
        </div>
      </section>
    </DashboardFrame>
  );
}
