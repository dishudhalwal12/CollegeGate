import { redirect } from "next/navigation";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { LoginForm } from "@/components/client-ui";
import { getServerSession } from "@/lib/auth";
import { hasAdminCredentials } from "@/lib/firebase-admin";

const accounts = [
  ["Student", "student@collegegate.demo", "CollegeGate@123"],
  ["Warden", "warden@collegegate.demo", "CollegeGate@123"],
  ["Guard", "guard@collegegate.demo", "CollegeGate@123"],
  ["Admin", "admin@collegegate.demo", "CollegeGate@123"],
] as const;

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
              <p className="section-kicker">Seeded role access only</p>
              <h1 className="dashboard-title">Enter CollegeGate</h1>
              <p className="hero-copy narrow">
                Sign in with one of the seeded Firebase accounts to access the role-specific
                dashboards. The login route exchanges the Firebase ID token for a secure session
                cookie before redirecting you.
              </p>

              {!hasAdminCredentials ? (
                <div className="inline-feedback danger">
                  <TriangleAlert size={16} />
                  Add Firebase Admin credentials in your environment before using the protected app
                  routes or seed script.
                </div>
              ) : null}

              <LoginForm />
            </div>

            <div className="section-grid-side stack-sm">
              <article className="hero-card">
                <div className="mock-pass-header">
                  <div>
                    <p className="micro-copy">Demo credentials</p>
                    <h2 className="card-title">Seeded Accounts</h2>
                  </div>
                  <ShieldCheck size={28} />
                </div>
                <div className="timeline-list">
                  {accounts.map(([label, email, password]) => (
                    <div className="story-card" key={email}>
                      <p className="micro-copy">{label}</p>
                      <strong>{email}</strong>
                      <p className="helper-copy">{password}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
