"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  ExternalLink,
  MessageCircleWarning,
  ShieldAlert,
} from "lucide-react";
import { OutpassCard, SectionHeading } from "@/components/dashboard-ui";
import { UserStatusToggle } from "@/components/client-ui";
import {
  buildWhatsAppLink,
  formatDateTime,
  getOutpassDisciplineSignal,
  type GateLog,
  type OutpassRecord,
  type SystemConfig,
  type UserProfile,
} from "@/lib/collegegate";

async function readJson(response: Response) {
  const data = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "The request could not be completed.");
  }

  return data;
}

type ViolationEntry = {
  label: string;
  detail: string;
  outpass: OutpassRecord;
  student: UserProfile;
};

function getViolationEntry(
  student: UserProfile,
  outpass: OutpassRecord,
  config: SystemConfig,
) {
  const discipline = getOutpassDisciplineSignal(outpass, config);

  if (!discipline.hasViolation) {
    return null;
  }

  if (discipline.curfewViolation) {
    return {
      label: "Returned after curfew",
      detail: `Entry was recorded after the ${config.curfewTime} campus cutoff.`,
      outpass,
      student,
    } satisfies ViolationEntry;
  }

  if (discipline.outsideAfterCurfew) {
    return {
      label: "Still outside after curfew",
      detail: `The student is still outside after the ${config.curfewTime} curfew window.`,
      outpass,
      student,
    } satisfies ViolationEntry;
  }

  if (discipline.lateReturn) {
    return {
      label: "Late return",
      detail: `Returned ${discipline.minutesLate} minute${discipline.minutesLate === 1 ? "" : "s"} after the approved time.`,
      outpass,
      student,
    } satisfies ViolationEntry;
  }

  return {
    label: "Return overdue",
    detail: "The expected return time has passed and the student has not been checked back in.",
    outpass,
    student,
  } satisfies ViolationEntry;
}

function buildPenaltyMessage(entry: ViolationEntry) {
  return [
    `Hello ${entry.student.name},`,
    `CollegeGate has flagged a hostel discipline issue for your pass.`,
    `Issue: ${entry.label}.`,
    `Details: ${entry.detail}`,
    `Destination: ${entry.outpass.destination}.`,
    `Approved return window: ${formatDateTime(entry.outpass.expectedReturnAt)}.`,
    "Please contact the admin or your warden immediately.",
  ].join("\n");
}

export function AdminControlCenter({
  users,
  outpasses,
  gateLogs,
  config,
}: {
  users: UserProfile[];
  outpasses: OutpassRecord[];
  gateLogs: GateLog[];
  config: SystemConfig;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);
  const students = useMemo(
    () => users.filter((user) => user.role === "student").sort((left, right) => left.name.localeCompare(right.name)),
    [users],
  );
  const staffQueue = useMemo(
    () =>
      users.filter(
        (user) => user.role === "pending" || (user.role !== "student" && !user.isActive),
      ),
    [users],
  );
  const blocks = useMemo(
    () => [...new Set(students.map((student) => student.hostelBlock))].sort((left, right) => left.localeCompare(right)),
    [students],
  );
  const outpassesByStudent = useMemo(() => {
    const nextMap = new Map<string, OutpassRecord[]>();

    outpasses.forEach((outpass) => {
      const group = nextMap.get(outpass.studentId) ?? [];
      group.push(outpass);
      nextMap.set(outpass.studentId, group);
    });

    return nextMap;
  }, [outpasses]);
  const gateLogByOutpassId = useMemo(
    () => new Map(gateLogs.map((log) => [log.outpassId, log])),
    [gateLogs],
  );
  const roster = useMemo(
    () =>
      students
        .map((student) => {
          const history = outpassesByStudent.get(student.uid) ?? [];
          const activePass =
            history.find((outpass) => outpass.status === "approved" || outpass.status === "exited") ??
            null;
          const latestPass = history[0] ?? null;
          const latestViolation =
            history
              .map((outpass) => getViolationEntry(student, outpass, config))
              .find((entry): entry is ViolationEntry => Boolean(entry)) ?? null;

          return {
            student,
            activePass,
            latestPass,
            latestViolation,
          };
        })
        .filter(({ student }) => {
          const query = deferredSearch.trim().toLowerCase();
          const matchesSearch =
            !query ||
            student.name.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query) ||
            student.phone.toLowerCase().includes(query);
          const matchesBlock =
            selectedBlock === "all" || student.hostelBlock === selectedBlock;
          return matchesSearch && matchesBlock;
        }),
    [config, deferredSearch, outpassesByStudent, selectedBlock, students],
  );
  const hostelOverview = useMemo(
    () =>
      blocks.map((block) => {
        const blockStudents = students.filter((student) => student.hostelBlock === block);
        const activeCount = blockStudents.filter((student) =>
          (outpassesByStudent.get(student.uid) ?? []).some(
            (outpass) => outpass.status === "exited",
          ),
        ).length;

        return {
          block,
          totalStudents: blockStudents.length,
          blockedStudents: blockStudents.filter((student) => student.passBlocked).length,
          activeCount,
          penalties: blockStudents.reduce(
            (count, student) => count + student.penaltyCount,
            0,
          ),
        };
      }),
    [blocks, outpassesByStudent, students],
  );
  const activeOutside = useMemo(
    () => outpasses.filter((outpass) => outpass.status === "exited"),
    [outpasses],
  );
  const violations = useMemo(
    () =>
      outpasses
        .map((outpass) => {
          const student = students.find((candidate) => candidate.uid === outpass.studentId);
          return student ? getViolationEntry(student, outpass, config) : null;
        })
        .filter((entry): entry is ViolationEntry => Boolean(entry))
        .slice(0, 12),
    [config, outpasses, students],
  );

  function patchUser(userId: string, payload: Record<string, unknown>, successMessage: string) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await readJson(
          await fetch(`/api/users/${userId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }),
        );
        setMessage(successMessage);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update that user.");
      }
    });
  }

  function togglePassBlock(student: UserProfile) {
    const defaultReason =
      student.lastPenaltyReason ??
      student.passBlockReason ??
      "Discipline review in progress. Contact the admin office.";
    const nextBlockedState = !student.passBlocked;
    const reason =
      nextBlockedState
        ? window.prompt("Why is this student's pass access being blocked?", defaultReason)
        : "";

    if (nextBlockedState && reason === null) {
      return;
    }

    patchUser(
      student.uid,
      {
        passBlocked: nextBlockedState,
        passBlockReason: nextBlockedState ? reason?.trim() || defaultReason : "",
      },
      nextBlockedState
        ? `${student.name} is now blocked from creating new passes.`
        : `${student.name} can request passes again.`,
    );
  }

  function issuePenalty(entry: ViolationEntry) {
    const messageBody = buildPenaltyMessage(entry);
    const whatsappLink = buildWhatsAppLink(entry.student.phone, messageBody);

    if (!whatsappLink) {
      setError(`No valid WhatsApp number is saved for ${entry.student.name}.`);
      return;
    }

    window.open(whatsappLink, "_blank", "noopener,noreferrer");
    patchUser(
      entry.student.uid,
      {
        penaltyCount: entry.student.penaltyCount + 1,
        lastPenaltyReason: `${entry.label}: ${entry.detail}`,
        lastPenaltyAt: new Date().toISOString(),
      },
      `Penalty note prepared for ${entry.student.name} on WhatsApp.`,
    );
  }

  return (
    <div className="stack-lg">
      <section className="dashboard-panel-grid">
        <div className="section-grid-main stack-sm">
          <SectionHeading title="Student Command Desk" kicker="Search, filter, and control access" />
          <article className="hero-card stack-sm">
            <div className="form-grid compact">
              <label className="form-field">
                <span>Search student</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or phone"
                />
              </label>
              <label className="form-field">
                <span>Hostel block</span>
                <select
                  value={selectedBlock}
                  onChange={(event) => setSelectedBlock(event.target.value)}
                >
                  <option value="all">All blocks</option>
                  {blocks.map((block) => (
                    <option key={block} value={block}>
                      {block}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="detail-grid">
              <div className="micro-stat">
                <span>Students visible</span>
                <strong>{roster.length}</strong>
              </div>
              <div className="micro-stat">
                <span>Blocked passes</span>
                <strong>{students.filter((student) => student.passBlocked).length}</strong>
              </div>
              <div className="micro-stat">
                <span>Violations flagged</span>
                <strong>{violations.length}</strong>
              </div>
              <div className="micro-stat">
                <span>Outside right now</span>
                <strong>{activeOutside.length}</strong>
              </div>
            </div>
          </article>
          {message ? <p className="inline-feedback success">{message}</p> : null}
          {error ? <p className="inline-feedback danger">{error}</p> : null}
        </div>
        <div className="section-grid-side stack-sm">
          <SectionHeading title="Hostel Overview" kicker="Block-by-block visibility" />
          <div className="cards-grid">
            {hostelOverview.map((item) => (
              <article className="hero-card compact stack-xs" key={item.block}>
                <p className="micro-copy">{item.block}</p>
                <h3>{item.totalStudents} students</h3>
                <div className="detail-grid">
                  <div>
                    <p className="micro-copy">Blocked</p>
                    <p>{item.blockedStudents}</p>
                  </div>
                  <div>
                    <p className="micro-copy">Outside</p>
                    <p>{item.activeCount}</p>
                  </div>
                  <div>
                    <p className="micro-copy">Penalties</p>
                    <p>{item.penalties}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="stack-sm">
        <SectionHeading title="Student Roster" kicker="Full visibility with discipline actions" />
        <div className="cards-grid">
          {roster.map(({ student, activePass, latestPass, latestViolation }) => (
            <article className="outpass-card" key={student.uid}>
              <div className="outpass-head">
                <div>
                  <p className="micro-copy">{student.hostelBlock}</p>
                  <h3>{student.name}</h3>
                </div>
                <div className="action-row">
                  <span className={`status-badge ${student.isActive ? "success" : "muted"}`}>
                    {student.isActive ? "Active account" : "Paused account"}
                  </span>
                  {student.passBlocked ? (
                    <span className="status-badge danger">Passes blocked</span>
                  ) : null}
                </div>
              </div>
              <div className="detail-grid">
                <div>
                  <p className="micro-copy">Phone</p>
                  <p>{student.phone}</p>
                </div>
                <div>
                  <p className="micro-copy">Penalties</p>
                  <p>{student.penaltyCount}</p>
                </div>
                <div>
                  <p className="micro-copy">Latest pass</p>
                  <p>{latestPass ? latestPass.destination : "No requests yet"}</p>
                </div>
                <div>
                  <p className="micro-copy">Active gate status</p>
                  <p>{activePass ? activePass.status : "Inside campus"}</p>
                </div>
              </div>
              {student.passBlockReason ? (
                <p className="inline-feedback danger">{student.passBlockReason}</p>
              ) : null}
              {student.lastPenaltyReason ? (
                <p className="helper-copy">
                  Last penalty: {student.lastPenaltyReason}
                  {student.lastPenaltyAt ? ` • ${formatDateTime(student.lastPenaltyAt)}` : ""}
                </p>
              ) : null}
              {latestViolation ? (
                <p className="inline-feedback danger">
                  <AlertTriangle size={16} />
                  {latestViolation.label}: {latestViolation.detail}
                </p>
              ) : null}
              <div className="action-row wrap-row">
                <button
                  className={student.passBlocked ? "ghost-button small" : "action-button small"}
                  type="button"
                  disabled={isPending}
                  onClick={() => togglePassBlock(student)}
                >
                  <Ban size={16} />
                  {student.passBlocked ? "Unblock pass" : "Block new passes"}
                </button>
                <button
                  className={student.isActive ? "ghost-button small" : "action-button small"}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    patchUser(
                      student.uid,
                      { isActive: !student.isActive },
                      student.isActive
                        ? `${student.name}'s account has been paused.`
                        : `${student.name}'s account is active again.`,
                    )
                  }
                >
                  {student.isActive ? "Pause account" : "Activate account"}
                </button>
                {latestViolation ? (
                  <button
                    className="ghost-button small"
                    type="button"
                    disabled={isPending}
                    onClick={() => issuePenalty(latestViolation)}
                  >
                    <MessageCircleWarning size={16} />
                    Penalty on WhatsApp
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {roster.length === 0 ? (
          <article className="hero-card">
            <p className="helper-copy">
              No students matched the current search and hostel filter.
            </p>
          </article>
        ) : null}
      </section>

      <section className="stack-sm">
        <SectionHeading title="Violation Watchlist" kicker="Late returns, curfew breaches, and open risks" />
        <div className="cards-grid">
          {violations.map((entry) => (
            <OutpassCard
              key={`${entry.student.uid}-${entry.outpass.id}`}
              outpass={entry.outpass}
              footer={
                <div className="stack-xs">
                  <p className="inline-feedback danger">
                    <ShieldAlert size={16} />
                    {entry.label}
                  </p>
                  <p className="helper-copy">{entry.detail}</p>
                  <div className="action-row wrap-row">
                    <button
                      className="action-button small"
                      type="button"
                      disabled={isPending}
                      onClick={() => issuePenalty(entry)}
                    >
                      Penalty on WhatsApp
                    </button>
                    <span className="helper-copy">
                      Student: {entry.student.phone}
                    </span>
                  </div>
                </div>
              }
            />
          ))}
        </div>
        {violations.length === 0 ? (
          <article className="hero-card">
            <p className="helper-copy">No late returns or curfew breaches are flagged right now.</p>
          </article>
        ) : null}
      </section>

      <section className="dashboard-panel-grid">
        <div className="section-grid-main stack-sm">
          <SectionHeading title="Students Outside Campus" kicker="Live movement board" />
          <div className="cards-grid">
            {activeOutside.map((outpass) => {
              const gateLog = gateLogByOutpassId.get(outpass.id);

              return (
                <OutpassCard
                  key={outpass.id}
                  outpass={outpass}
                  footer={
                    <div className="detail-grid">
                      <div>
                        <p className="micro-copy">Exit scan</p>
                        <p>{gateLog?.exitAt ? formatDateTime(gateLog.exitAt) : "Awaiting exit"}</p>
                      </div>
                      <div>
                        <p className="micro-copy">Return scan</p>
                        <p>{gateLog?.returnAt ? formatDateTime(gateLog.returnAt) : "Still open"}</p>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
          {activeOutside.length === 0 ? (
            <article className="hero-card">
              <p className="helper-copy">Everyone is currently marked inside campus.</p>
            </article>
          ) : null}
        </div>
        <div className="section-grid-side stack-sm">
          <SectionHeading title="Gate Feed" kicker="Latest guard movement" />
          <div className="stack-sm">
            {gateLogs.slice(0, 6).map((log) => (
              <article className="hero-card compact stack-xs" key={log.id}>
                <p className="micro-copy">{log.studentName}</p>
                <strong>{log.returnAt ? "Returned to campus" : "Exited campus"}</strong>
                <p className="helper-copy">
                  {log.returnAt ? formatDateTime(log.returnAt) : formatDateTime(log.exitAt)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="stack-sm">
        <SectionHeading title="Access Queue" kicker="Legacy pending users and paused staff accounts" />
        <div className="users-grid">
          {staffQueue.map((user) => (
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
                    ? "Pending"
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
                  <p className="micro-copy">Block</p>
                  <p>{user.hostelBlock}</p>
                </div>
                <div>
                  <p className="micro-copy">Department</p>
                  <p>{user.department}</p>
                </div>
              </div>
              <UserStatusToggle user={user} />
            </article>
          ))}
        </div>
        {staffQueue.length === 0 ? (
          <article className="hero-card">
            <p className="helper-copy">
              No pending staff approvals or paused staff accounts need attention right now.
            </p>
          </article>
        ) : null}
      </section>

      <section className="stack-sm">
        <SectionHeading title="Quick Actions" kicker="Fast admin shortcuts" />
        <div className="cards-grid">
          <article className="hero-card compact stack-xs">
            <p className="micro-copy">Reports</p>
            <strong>Download exports</strong>
            <div className="action-row wrap-row">
              <a className="action-button small" href="/api/reports?format=csv">
                <ExternalLink size={16} />
                CSV
              </a>
              <a className="ghost-button small" href="/api/reports?format=pdf">
                PDF
              </a>
            </div>
          </article>
          <article className="hero-card compact stack-xs">
            <p className="micro-copy">Discipline</p>
            <strong>Monitor curfew and late return cases</strong>
            <p className="helper-copy">
              The watchlist updates from guard entry scans and active open passes.
            </p>
          </article>
          <article className="hero-card compact stack-xs">
            <p className="micro-copy">Entry policy</p>
            <strong>Guard now validates exit and entry separately</strong>
            <p className="helper-copy">
              Students must present the same QR pass again when they return to campus.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
