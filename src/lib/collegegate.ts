import { differenceInMinutes, format, isAfter, parseISO } from "date-fns";
import { z } from "zod";

export const assignableRoles = ["student", "warden", "guard", "admin"] as const;
export type AssignableRole = (typeof assignableRoles)[number];

export const instantAccessRoles = ["student", "warden", "guard"] as const;
export type InstantAccessRole = (typeof instantAccessRoles)[number];

export const roles = [...assignableRoles, "pending"] as const;
export type UserRole = (typeof roles)[number];

export const statuses = [
  "pending",
  "approved",
  "rejected",
  "exited",
  "returned",
] as const;
export type OutpassStatus = (typeof statuses)[number];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  requestedRole?: AssignableRole;
  department: string;
  hostelBlock: string;
  assignmentKey: string;
  phone: string;
  wardenId?: string;
  wardenName?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface OutpassRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentBlock: string;
  destination: string;
  reason: string;
  emergency: boolean;
  assignedWardenId: string;
  assignedWardenName: string;
  status: OutpassStatus;
  departureAt: string;
  expectedReturnAt: string;
  approverRemark?: string;
  qrToken?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  exitAt?: string;
  returnedAt?: string;
}

export interface GateLog {
  id: string;
  outpassId: string;
  studentName: string;
  qrToken: string;
  exitAt?: string;
  returnAt?: string;
  scannedByGuardId: string;
  scannedByGuardName: string;
  notes?: string;
  updatedAt: string;
}

export interface SystemConfig {
  maxOutpassHours: number;
  curfewTime: string;
  emergencyOverrideHours: number;
  allowEmergencyAfterCurfew: boolean;
  updatedAt?: string;
}

export interface DashboardSummary {
  total: number;
  pending: number;
  active: number;
  overdue: number;
  completed: number;
}

export type SessionUser = UserProfile;

export const defaultSystemConfig: SystemConfig = {
  maxOutpassHours: 6,
  curfewTime: "21:00",
  emergencyOverrideHours: 10,
  allowEmergencyAfterCurfew: true,
};

export const createRequestSchema = z.object({
  destination: z.string().trim().min(2).max(80),
  reason: z.string().trim().min(10).max(280),
  departureAt: z.string().datetime(),
  expectedReturnAt: z.string().datetime(),
  emergency: z.boolean().default(false),
});

export const registerProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  role: z.enum(assignableRoles),
  department: z.string().trim().min(2).max(80),
  hostelBlock: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(24),
});

export const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  remark: z.string().trim().min(2).max(180),
});

export const scanSchema = z.object({
  qrToken: z.string().trim().min(8).max(200),
});

export const configSchema = z.object({
  maxOutpassHours: z.number().int().min(1).max(24),
  curfewTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  emergencyOverrideHours: z.number().int().min(1).max(48),
  allowEmergencyAfterCurfew: z.boolean(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const userAccessUpdateSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(roles).optional(),
    requestedRole: z.enum(assignableRoles).optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      value.isActive !== undefined ||
      value.role !== undefined ||
      value.requestedRole !== undefined,
    {
      message: "Provide at least one user access field to update.",
    },
  );

export function parseJson<T>(input: unknown, schema: z.ZodType<T>) {
  return schema.parse(input);
}

export function createAssignmentKey(input: string) {
  const normalized = input
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "general";
}

export function buildRegistrationProfile(
  input: z.infer<typeof registerProfileSchema>,
  timestamp = new Date().toISOString(),
) {
  const needsAdminApproval = input.role === "admin";
  const sessionRole: UserRole = needsAdminApproval ? "pending" : input.role;

  return {
    sessionRole,
    message: needsAdminApproval
      ? "Your admin access request has been submitted for approval."
      : `Your ${input.role} account is ready.`,
    userProfile: {
      name: input.name,
      email: input.email,
      role: sessionRole,
      department: input.department,
      hostelBlock: input.hostelBlock,
      assignmentKey: createAssignmentKey(input.hostelBlock),
      phone: input.phone,
      isActive: !needsAdminApproval,
      createdAt: timestamp,
      ...(needsAdminApproval ? { requestedRole: "admin" as const } : {}),
    },
  };
}

export function resolveAssignedWarden(
  student: Pick<UserProfile, "assignmentKey" | "hostelBlock">,
  wardens: Array<
    Pick<UserProfile, "uid" | "name" | "role" | "isActive" | "assignmentKey">
  >,
) {
  const matches = wardens.filter(
    (warden) =>
      warden.role === "warden" &&
      warden.isActive &&
      warden.assignmentKey === student.assignmentKey,
  );

  if (matches.length === 1) {
    return { warden: matches[0], issue: null };
  }

  return {
    warden: null,
    issue:
      matches.length === 0
        ? `No warden assigned to this block (${student.hostelBlock}).`
        : `Multiple wardens configured for this block (${student.hostelBlock}).`,
  };
}

export function serializeUser(uid: string, data: Record<string, unknown>): UserProfile {
  const role = roles.includes(data.role as UserRole)
    ? (data.role as UserRole)
    : "student";
  const requestedRole = assignableRoles.includes(data.requestedRole as AssignableRole)
    ? (data.requestedRole as AssignableRole)
    : undefined;

  return {
    uid,
    name: String(data.name ?? "Unknown User"),
    email: String(data.email ?? ""),
    role,
    requestedRole,
    department: String(data.department ?? "Student Affairs"),
    hostelBlock: String(data.hostelBlock ?? "Block A"),
    assignmentKey: createAssignmentKey(
      String(data.assignmentKey ?? data.hostelBlock ?? "Block A"),
    ),
    phone: String(data.phone ?? ""),
    wardenId: data.wardenId ? String(data.wardenId) : undefined,
    wardenName: data.wardenName ? String(data.wardenName) : undefined,
    isActive: Boolean(data.isActive ?? true),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
  };
}

export function serializeOutpass(
  id: string,
  data: Record<string, unknown>,
): OutpassRecord {
  return {
    id,
    studentId: String(data.studentId),
    studentName: String(data.studentName ?? "Unknown Student"),
    studentEmail: String(data.studentEmail ?? ""),
    studentBlock: String(data.studentBlock ?? "Block A"),
    destination: String(data.destination ?? "Campus Exit"),
    reason: String(data.reason ?? ""),
    emergency: Boolean(data.emergency),
    assignedWardenId: String(data.assignedWardenId ?? ""),
    assignedWardenName: String(data.assignedWardenName ?? "Warden"),
    status: (data.status as OutpassStatus) ?? "pending",
    departureAt: String(data.departureAt),
    expectedReturnAt: String(data.expectedReturnAt),
    approverRemark: data.approverRemark ? String(data.approverRemark) : undefined,
    qrToken: data.qrToken ? String(data.qrToken) : undefined,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    rejectedAt: data.rejectedAt ? String(data.rejectedAt) : undefined,
    exitAt: data.exitAt ? String(data.exitAt) : undefined,
    returnedAt: data.returnedAt ? String(data.returnedAt) : undefined,
  };
}

export function serializeGateLog(id: string, data: Record<string, unknown>): GateLog {
  return {
    id,
    outpassId: String(data.outpassId ?? id),
    studentName: String(data.studentName ?? "Student"),
    qrToken: String(data.qrToken ?? ""),
    exitAt: data.exitAt ? String(data.exitAt) : undefined,
    returnAt: data.returnAt ? String(data.returnAt) : undefined,
    scannedByGuardId: String(data.scannedByGuardId ?? ""),
    scannedByGuardName: String(data.scannedByGuardName ?? "Guard"),
    notes: data.notes ? String(data.notes) : undefined,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export function formatDateTime(input?: string) {
  if (!input) return "Not recorded";
  return format(parseISO(input), "dd MMM yyyy, hh:mm a");
}

export function formatShortDate(input?: string) {
  if (!input) return "Pending";
  return format(parseISO(input), "dd MMM");
}

export function statusLabel(status: OutpassStatus) {
  switch (status) {
    case "pending":
      return "Awaiting Warden Approval";
    case "approved":
      return "Approved - Show at Gate";
    case "rejected":
      return "Rejected";
    case "exited":
      return "Exited Campus";
    case "returned":
      return "Completed";
    default:
      return status;
  }
}

export function roleLabel(role: UserRole) {
  if (role === "pending") {
    return "Pending Approval";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function isOutpassOverdue(
  outpass: Pick<OutpassRecord, "status" | "expectedReturnAt" | "returnedAt">,
  now = new Date(),
) {
  if (outpass.status === "rejected" || outpass.status === "returned" || outpass.returnedAt) {
    return false;
  }

  return isAfter(now, parseISO(outpass.expectedReturnAt));
}

export function getStatusTone(status: OutpassStatus, overdue = false) {
  if (overdue) return "danger";
  switch (status) {
    case "approved":
      return "warning";
    case "rejected":
      return "muted";
    case "exited":
      return "accent";
    case "returned":
      return "success";
    default:
      return "warning";
  }
}

export function validateRequestWindow(
  request: z.infer<typeof createRequestSchema>,
  config: SystemConfig,
) {
  const departureAt = parseISO(request.departureAt);
  const expectedReturnAt = parseISO(request.expectedReturnAt);

  if (!isAfter(expectedReturnAt, departureAt)) {
    throw new Error("Expected return must be after departure time.");
  }

  const durationMinutes = differenceInMinutes(expectedReturnAt, departureAt);
  const maxHours = request.emergency
    ? config.emergencyOverrideHours
    : config.maxOutpassHours;

  if (durationMinutes > maxHours * 60) {
    throw new Error(`This request exceeds the ${maxHours}-hour campus policy.`);
  }

  const [curfewHour, curfewMinute] = config.curfewTime.split(":").map(Number);
  const curfewCutoff = new Date(expectedReturnAt);
  curfewCutoff.setHours(curfewHour, curfewMinute, 0, 0);

  if (
    isAfter(expectedReturnAt, curfewCutoff) &&
    !(request.emergency && config.allowEmergencyAfterCurfew)
  ) {
    throw new Error("Expected return crosses the configured curfew.");
  }
}

export function summarizeOutpasses(outpasses: OutpassRecord[]): DashboardSummary {
  return outpasses.reduce(
    (summary, outpass) => {
      summary.total += 1;

      if (outpass.status === "pending") summary.pending += 1;
      if (outpass.status === "approved" || outpass.status === "exited") summary.active += 1;
      if (outpass.status === "returned") summary.completed += 1;
      if (isOutpassOverdue(outpass)) summary.overdue += 1;

      return summary;
    },
    {
      total: 0,
      pending: 0,
      active: 0,
      overdue: 0,
      completed: 0,
    } satisfies DashboardSummary,
  );
}

export function sortByCreated(records: OutpassRecord[]) {
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function buildCsv(records: OutpassRecord[]) {
  const headers = [
    "Student",
    "Email",
    "Destination",
    "Status",
    "Emergency",
    "Departure",
    "Expected Return",
    "Approved By",
    "Remark",
  ];

  const rows = records.map((record) => [
    record.studentName,
    record.studentEmail,
    record.destination,
    statusLabel(record.status),
    record.emergency ? "Yes" : "No",
    formatDateTime(record.departureAt),
    formatDateTime(record.expectedReturnAt),
    record.assignedWardenName,
    record.approverRemark ?? "",
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
