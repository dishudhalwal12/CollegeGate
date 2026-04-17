import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChartNoAxesCombined,
  QrCode,
  Shield,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const anchors = [
  ["01", "Home", "#home"],
  ["02", "Story", "#story"],
  ["03", "Flow", "#workflow"],
  ["04", "Roles", "#roles"],
  ["05", "Pass", "#passport"],
  ["06", "Reports", "#reports"],
] as const;

const workflow = [
  {
    index: "01",
    title: "Student Request",
    body: "Students submit destination, reason, departure time, expected return, and emergency priority from a mobile-first form.",
  },
  {
    index: "02",
    title: "Warden Approval",
    body: "Wardens review pending requests with visible history, then approve or reject using remarks and rule-aware decisions.",
  },
  {
    index: "03",
    title: "Gate Scan",
    body: "A QR pass turns approvals into instant gate validation, logging exit and return without phone calls or paper registers.",
  },
  {
    index: "04",
    title: "Admin Oversight",
    body: "Reports, campus rules, late-return flags, and live movement visibility stay available from one control room dashboard.",
  },
] as const;

const roles = [
  {
    icon: ShieldCheck,
    title: "Student",
    body: "One tap to request, one place to track approval, one QR to show at the gate.",
  },
  {
    icon: UserRoundCheck,
    title: "Warden",
    body: "Approval queues with prior history, remarks, and late-return visibility instead of scattered calls and chats.",
  },
  {
    icon: Shield,
    title: "Guard",
    body: "A live gate interface for validating passes, marking exits, and confirming returns from any phone camera.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Admin",
    body: "System rules, analytics, exports, and user controls inside a single institution-level dashboard.",
  },
] as const;

export default function Home() {
  return (
    <div className="page-frame">
      <div className="ambient-shape ambient-one" />
      <div className="ambient-shape ambient-two" />

      <aside className="anchor-rail" aria-label="Section navigation">
        <nav>
          {anchors.map(([index, label, href]) => (
            <a href={href} key={href}>
              {index} {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="landing-shell">
        <section className="landing-section hero-section" id="home">
          <p className="section-kicker">JIMS Vasant Kunj • Campus Outpass & Gate Control</p>

          <div className="hero-grid">
            <div className="section-grid-main stack-lg">
              <p className="micro-copy">Paper register out. Live movement in.</p>
              <h1 className="display-title">
                COLLEGE
                <span>GATE</span>
              </h1>
              <p className="hero-copy narrow">
                CollegeGate turns the hostel register into a real-time approval and gate workflow.
                Students request passes, wardens approve with remarks, guards scan QR codes, and
                admins export clean campus reports from the same live system.
              </p>
              <div className="action-row">
                <Link className="action-button" href="/login">
                  Open The Platform
                  <ArrowRight size={16} />
                </Link>
                <a className="ghost-button" href="#workflow">
                  Explore Workflow
                </a>
              </div>
              <div className="word-ribbon">
                <span>Approve</span>
                <span>Scan</span>
                <span>Return</span>
                <span>Report</span>
              </div>
            </div>

            <div className="section-grid-side">
              <article className="hero-card">
                <div className="mock-pass-header">
                  <div>
                    <p className="micro-copy">Live pass preview</p>
                    <h2 className="card-title">Approved Gate Slip</h2>
                  </div>
                  <BadgeCheck size={28} />
                </div>

                <div className="panel-shell">
                  <div className="mock-pass">
                    <div className="mock-pass-header">
                      <strong>Maanas Chandra</strong>
                      <span className="helper-pill">Block A</span>
                    </div>
                    <div className="mock-grid">
                      <div className="micro-stat">
                        <span>Departure</span>
                        <strong>05:30 PM</strong>
                      </div>
                      <div className="micro-stat">
                        <span>Due Back</span>
                        <strong>08:30 PM</strong>
                      </div>
                      <div className="micro-stat">
                        <span>Status</span>
                        <strong>QR Active</strong>
                      </div>
                      <div className="micro-stat">
                        <span>Guard Scan</span>
                        <strong>Exit Ready</strong>
                      </div>
                    </div>
                  </div>

                  <div className="cards-grid">
                    <article className="info-card">
                      <div className="info-card-topline">
                        <span>Pending</span>
                        <Building2 size={18} />
                      </div>
                      <strong>12</strong>
                    </article>
                    <article className="info-card">
                      <div className="info-card-topline">
                        <span>Outside</span>
                        <QrCode size={18} />
                      </div>
                      <strong>07</strong>
                    </article>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="story">
          <div className="story-grid">
            <div className="section-grid-main stack-lg">
              <p className="section-kicker">Problem Statement</p>
              <h2 className="outline-title">
                OUR
                <span>STORY</span>
              </h2>
              <p className="hero-copy narrow">
                The project began with a familiar bottleneck: handwritten registers, verbal
                approvals, and zero real-time visibility after sunset. CollegeGate reframes that
                same flow as a digital chain of trust between students, wardens, guards, and admin.
              </p>
              <div className="feature-list">
                <div className="bullet-item">
                  <strong>No standard request flow</strong>
                  <p className="helper-copy">
                    Students chase approvals across calls, WhatsApp, and office visits with no
                    single record.
                  </p>
                </div>
                <div className="bullet-item">
                  <strong>No live gate verification</strong>
                  <p className="helper-copy">
                    Guards end up calling wardens because the register does not prove approval.
                  </p>
                </div>
                <div className="bullet-item">
                  <strong>No actionable reporting</strong>
                  <p className="helper-copy">
                    Late returns, emergency frequency, and daily volume stay buried in paper.
                  </p>
                </div>
              </div>
            </div>

            <div className="section-grid-side stack-sm">
              <article className="story-card">
                <p className="micro-copy">Before</p>
                <h3>Fat register at the gate</h3>
                <p className="helper-copy">
                  Manual sign-outs, dim-light handwriting, and no dependable return tracking after a
                  busy evening shift.
                </p>
              </article>
              <article className="story-card">
                <p className="micro-copy">After</p>
                <h3>Shared live dashboard</h3>
                <p className="helper-copy">
                  One system of record for pending approvals, QR validation, active exits, and
                  overdue monitoring.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="workflow">
          <p className="section-kicker">End-to-end campus movement</p>
          <div className="hero-grid">
            <div className="section-grid-main stack-lg">
              <h2 className="display-title">
                LIVE
                <span>FLOW</span>
              </h2>
              <div className="timeline-list">
                {workflow.map((step) => (
                  <article className="role-card" key={step.index}>
                    <span className="timeline-index">{step.index}</span>
                    <h3>{step.title}</h3>
                    <p className="helper-copy">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="section-grid-side stack-sm">
              <article className="passport-card">
                <p className="micro-copy">System rhythm</p>
                <h3>Pending → Approved → Exited → Returned</h3>
                <p className="helper-copy">
                  Overdue is derived automatically once an active pass crosses its expected return
                  time, so the guard and warden never work from stale data.
                </p>
              </article>
              <article className="passport-card">
                <p className="micro-copy">Built for phones</p>
                <h3>Mobile-first by design</h3>
                <p className="helper-copy">
                  The entire system is tuned for hostel corridors, faculty offices, and gate-side
                  use on compact screens.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="roles">
          <p className="section-kicker">Four coordinated roles</p>
          <h2 className="outline-title">
            CAMPUS
            <span>CREW</span>
          </h2>
          <div className="role-grid">
            {roles.map((role) => {
              const Icon = role.icon;

              return (
                <article className="role-card" key={role.title}>
                  <Icon size={24} />
                  <h3>{role.title}</h3>
                  <p className="helper-copy">{role.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section" id="passport">
          <div className="feature-grid">
            <div className="section-grid-main stack-lg">
              <p className="section-kicker">QR pass experience</p>
              <h2 className="display-title">
                GATE
                <span>PASS</span>
              </h2>
              <p className="hero-copy narrow">
                The approved pass is the moment where the system becomes operational. It carries the
                student, route, timing, and QR token that powers gate validation without any extra
                calls or manual handoffs.
              </p>
              <div className="action-row">
                <Link href="/student" className="ghost-button">
                  Student Dashboard
                </Link>
                <Link href="/guard/scan" className="action-button">
                  Open Scanner
                </Link>
              </div>
            </div>

            <div className="section-grid-side">
              <article className="passport-card">
                <div className="passport-grid">
                  <div className="stack-sm">
                    <p className="micro-copy">Single source of proof</p>
                    <h3>Approved Outpass Card</h3>
                    <div className="pill-list">
                      <div className="pill-item">
                        <strong>Student-linked</strong>
                        <p className="helper-copy">Bound to one request and one student record.</p>
                      </div>
                      <div className="pill-item">
                        <strong>Gate-readable</strong>
                        <p className="helper-copy">Exit on first scan, return on second scan.</p>
                      </div>
                      <div className="pill-item">
                        <strong>Remark-aware</strong>
                        <p className="helper-copy">
                          Warden conditions stay visible through the gate cycle.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="passport-qr">
                    <QrCode size={140} strokeWidth={1.1} />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="reports">
          <p className="section-kicker">Admin oversight</p>
          <div className="report-grid">
            <div className="report-card">
              <h2 className="outline-title">
                CONTROL
                <span>ROOM</span>
              </h2>
              <p className="hero-copy narrow">
                Admins manage users, update campus rules, review live movements, and export clean
                daily reports in CSV or PDF. Late-return flags stay visible across the warden and
                guard surfaces.
              </p>
              <div className="cards-grid">
                <article className="info-card">
                  <div className="info-card-topline">
                    <span>CSV / PDF</span>
                    <ChartNoAxesCombined size={18} />
                  </div>
                  <strong>2X</strong>
                </article>
                <article className="info-card">
                  <div className="info-card-topline">
                    <span>Roles</span>
                    <ShieldCheck size={18} />
                  </div>
                  <strong>4</strong>
                </article>
              </div>
            </div>

            <div className="report-card">
              <p className="micro-copy">Policy layer</p>
              <div className="report-list-item">
                <strong>Curfew-aware validation</strong>
                <p className="helper-copy">Maximum hours and emergency windows are configurable.</p>
              </div>
              <div className="report-list-item">
                <strong>Late return visibility</strong>
                <p className="helper-copy">
                  Active passes highlight automatically after the expected return time.
                </p>
              </div>
              <div className="report-list-item">
                <strong>Seeded demo roles</strong>
                <p className="helper-copy">
                  Student, warden, guard, and admin accounts are ready to populate the platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="cta">
          <div className="cta-grid">
            <div className="section-grid-main stack-lg">
              <p className="section-kicker">Ready to run the full cycle?</p>
              <h2 className="closing-title">
                MOVE
                <span>WITH TRUST</span>
              </h2>
              <p className="hero-copy narrow">
                CollegeGate replaces guesswork at the gate with a tracked, role-based workflow that
                still feels fast on a phone. The landing page sets the tone; the dashboards run the
                campus.
              </p>
              <div className="action-row">
                <Link className="action-button" href="/login">
                  Launch CollegeGate
                </Link>
                <a className="ghost-button" href="#home">
                  Back To Top
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
