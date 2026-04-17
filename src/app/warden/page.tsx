import { DashboardFrame, OutpassCard, SectionHeading, SummaryGrid } from "@/components/dashboard-ui";
import { DecisionForm } from "@/components/client-ui";
import { requireSession } from "@/lib/auth";
import { getWardenDashboard } from "@/lib/data";

export default async function WardenPage() {
  const session = await requireSession("warden");
  const { requests, summary, studentsById, history } = await getWardenDashboard(session.uid);

  return (
    <DashboardFrame
      session={session}
      eyebrow="Warden approval queue"
      title="Review With Context"
    >
      <SummaryGrid summary={summary} />

      <section className="stack-sm">
        <SectionHeading
          title="Assigned Requests"
          kicker="Pending, active, and completed for your group"
        />
        <div className="cards-grid">
          {requests.map((outpass) => {
            const student = studentsById.get(outpass.studentId);
            const recentHistory = (history.get(outpass.studentId) ?? [])
              .filter((entry) => entry.id !== outpass.id)
              .slice(0, 2);

            return (
              <OutpassCard
                key={outpass.id}
                outpass={outpass}
                footer={
                  <div className="stack-sm">
                    {student ? (
                      <div className="detail-grid">
                        <div>
                          <p className="micro-copy">Department</p>
                          <p>{student.department}</p>
                        </div>
                        <div>
                          <p className="micro-copy">Phone</p>
                          <p>{student.phone}</p>
                        </div>
                      </div>
                    ) : null}

                    {recentHistory.length > 0 ? (
                      <div className="stack-xs">
                        <p className="micro-copy">Recent student history</p>
                        {recentHistory.map((entry) => (
                          <p className="helper-copy" key={entry.id}>
                            {entry.destination} • {entry.status}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {outpass.status === "pending" ? (
                      <DecisionForm outpassId={outpass.id} />
                    ) : null}
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
