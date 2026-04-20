import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/client-ui";
import { getServerSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect(`/${session.role}`);
  }

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        <section className="landing-section">
          <div className="hero-grid">
            <div className="section-grid-main stack-lg">
              <p className="section-kicker">Production onboarding</p>
              <h1 className="dashboard-title">Access CollegeGate</h1>
              <p className="hero-copy narrow">
                Create a real Firebase-backed account, choose the role you are requesting, and move
                into the correct workflow. Student accounts activate immediately, while warden,
                guard, and admin requests stay pending until approved.
              </p>

              <LoginForm />
            </div>

            <div className="section-grid-side stack-sm">
              <article className="hero-card">
                <div className="mock-pass-header">
                  <div>
                    <p className="micro-copy">Access model</p>
                    <h2 className="card-title">Role Activation</h2>
                  </div>
                  <ShieldCheck size={28} />
                </div>
                <div className="timeline-list">
                  <div className="story-card">
                    <p className="micro-copy">Student</p>
                    <strong>Instant access</strong>
                    <p className="helper-copy">
                      Register, sign in, and start requesting outpasses right away.
                    </p>
                  </div>
                  <div className="story-card">
                    <p className="micro-copy">Warden / Guard / Admin</p>
                    <strong>Approval required</strong>
                    <p className="helper-copy">
                      The signup flow records the requested role and safely holds access until an
                      admin activates it.
                    </p>
                  </div>
                  <div className="story-card">
                    <p className="micro-copy">Seed script</p>
                    <strong>Still uses Admin SDK</strong>
                    <p className="helper-copy">
                      Only demo seeding still needs Firebase Admin credentials; normal app auth no
                      longer depends on them.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
