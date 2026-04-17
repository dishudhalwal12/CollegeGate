import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowUpRight, Clock3, ShieldAlert, SquareActivity, CheckCheck } from "lucide-react";
import {
  getStatusTone,
  isOutpassOverdue,
  roleLabel,
  statusLabel,
  type DashboardSummary,
  type OutpassRecord,
  type SessionUser,
} from "@/lib/collegegate";
import { LogoutButton } from "@/components/client-ui";

export function DashboardFrame({
  session,
  title,
  eyebrow,
  children,
}: {
  session: SessionUser;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        <header className="dashboard-hero">
          <div className="stack-xs">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="dashboard-title">{title}</h1>
            <p className="hero-copy narrow">
              Signed in as {session.name} • {roleLabel(session.role)} • {session.email}
            </p>
          </div>
          <div className="hero-card compact">
            <p className="micro-copy">Quick links</p>
            <div className="dashboard-links">
              <Link href="/" className="text-link">
                Landing page
              </Link>
              <Link href={`/${session.role}`} className="text-link">
                Role dashboard
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function SummaryGrid({ summary }: { summary: DashboardSummary }) {
  const cards = [
    {
      label: "Total Requests",
      value: summary.total,
      icon: SquareActivity,
    },
    {
      label: "Pending Review",
      value: summary.pending,
      icon: Clock3,
    },
    {
      label: "Active Outside",
      value: summary.active,
      icon: ShieldAlert,
    },
    {
      label: "Completed",
      value: summary.completed,
      icon: CheckCheck,
    },
  ];

  return (
    <section className="summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className="info-card" key={card.label}>
            <div className="info-card-topline">
              <span>{card.label}</span>
              <Icon size={18} />
            </div>
            <strong>{card.value}</strong>
          </article>
        );
      })}
    </section>
  );
}

export function StatusBadge({ outpass }: { outpass: OutpassRecord }) {
  const overdue = isOutpassOverdue(outpass);
  const tone = getStatusTone(outpass.status, overdue);

  return <span className={`status-badge ${tone}`}>{overdue ? "Late Return Flag" : statusLabel(outpass.status)}</span>;
}

export function OutpassCard({
  outpass,
  footer,
}: {
  outpass: OutpassRecord;
  footer?: ReactNode;
}) {
  const overdue = isOutpassOverdue(outpass);

  return (
    <article className="outpass-card">
      <div className="outpass-head">
        <div>
          <p className="micro-copy">{outpass.studentBlock}</p>
          <h3>{outpass.studentName}</h3>
        </div>
        <StatusBadge outpass={outpass} />
      </div>
      <div className="stack-xs">
        <p className="card-title">
          {outpass.destination}
          {outpass.emergency ? " • Emergency" : ""}
        </p>
        <p className="helper-copy">{outpass.reason}</p>
      </div>
      <div className="detail-grid">
        <div>
          <p className="micro-copy">Departure</p>
          <p>{new Date(outpass.departureAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="micro-copy">Expected Return</p>
          <p>{new Date(outpass.expectedReturnAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="micro-copy">Warden</p>
          <p>{outpass.assignedWardenName}</p>
        </div>
        <div>
          <p className="micro-copy">Remark</p>
          <p>{outpass.approverRemark ?? "Pending review"}</p>
        </div>
      </div>
      {overdue ? <p className="inline-feedback danger">This pass has crossed its expected return time.</p> : null}
      {footer ? <div className="outpass-footer">{footer}</div> : null}
    </article>
  );
}

export function SectionHeading({
  title,
  kicker,
  action,
}: {
  title: string;
  kicker: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div className="stack-xs">
        <p className="micro-copy">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function InlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link inline" href={href}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
