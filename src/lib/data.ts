import { randomUUID } from "node:crypto";
import { jsPDF } from "jspdf";
import type { AuthSession } from "@/lib/auth";
import {
  configSchema,
  createRequestSchema,
  decisionSchema,
  defaultSystemConfig,
  parseJson,
  resolveAssignedWarden,
  scanSchema,
  serializeGateLog,
  serializeOutpass,
  serializeUser,
  sortByCreated,
  summarizeOutpasses,
  userAccessUpdateSchema,
  validateRequestWindow,
  type GateLog,
  type OutpassRecord,
  type SystemConfig,
  type UserProfile,
} from "@/lib/collegegate";
import {
  getDocument,
  listDocuments,
  patchDocument,
  queryDocuments,
  setDocument,
} from "@/lib/firestore-rest";
import {
  getLocalOutpass,
  getLocalSystemConfig,
  getLocalUser,
  listLocalGateLogs,
  listLocalOutpasses,
  listLocalUsers,
  readLocalStoreSnapshot,
  setLocalSystemConfig,
  shouldUseLocalStore,
  upsertLocalGateLog,
  upsertLocalOutpass,
  upsertLocalUser,
} from "@/lib/local-store";

async function getOptionalUserProfile(authToken: string, uid: string) {
  try {
    const snapshot = await getDocument<Record<string, unknown>>(`users/${uid}`, authToken);

    if (snapshot) {
      return serializeUser(snapshot.id, snapshot.data);
    }
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return getLocalUser(uid);
}

async function getUserProfile(authToken: string, uid: string) {
  const localUser = await getOptionalUserProfile(authToken, uid);

  if (!localUser) {
    throw new Error("The user profile was not found in CollegeGate.");
  }

  return localUser;
}

async function getSystemConfig(authToken: string): Promise<SystemConfig> {
  try {
    const snapshot = await getDocument<Record<string, unknown>>("systemConfig/campus", authToken);

    if (snapshot) {
      return {
        ...defaultSystemConfig,
        ...(snapshot.data as Partial<SystemConfig>),
      };
    }
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return getLocalSystemConfig();
}

async function getUsers(authToken: string) {
  try {
    const snapshots = await listDocuments<Record<string, unknown>>("users", authToken);
    return snapshots.map((document) => serializeUser(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return listLocalUsers();
}

async function getUsersByIds(authToken: string, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  const users = await Promise.all(
    uniqueUserIds.map((uid) => getOptionalUserProfile(authToken, uid)),
  );

  return users.filter((user): user is UserProfile => Boolean(user));
}

async function queryUsersOrNull(
  authToken: string,
  filters: Array<{ field: string; value: unknown }>,
  limit = 25,
) {
  try {
    const snapshots = await queryDocuments<Record<string, unknown>>(
      "users",
      authToken,
      filters,
      limit,
    );

    return snapshots.map((document) => serializeUser(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return null;
}

async function getActiveWardensForStudent(authToken: string, student: UserProfile) {
  const assignmentWardens = await queryUsersOrNull(
    authToken,
    [
      { field: "assignmentKey", value: student.assignmentKey },
      { field: "role", value: "warden" },
      { field: "isActive", value: true },
    ],
    20,
  );

  if (assignmentWardens && assignmentWardens.length > 0) {
    return assignmentWardens;
  }

  const fallbackWardens = await queryUsersOrNull(
    authToken,
    [
      { field: "hostelBlock", value: student.hostelBlock },
      { field: "role", value: "warden" },
      { field: "isActive", value: true },
    ],
    20,
  );

  if (fallbackWardens) {
    return fallbackWardens;
  }

  return listLocalUsers().filter(
    (user) =>
      user.role === "warden" &&
      user.isActive &&
      (user.assignmentKey === student.assignmentKey || user.hostelBlock === student.hostelBlock),
  );
}

async function resolveStoredWarden(authToken: string, student: UserProfile) {
  if (!student.wardenId) {
    return null;
  }

  if (student.wardenName) {
    return {
      uid: student.wardenId,
      name: student.wardenName,
    };
  }

  const warden = await getOptionalUserProfile(authToken, student.wardenId);

  if (!warden || warden.role !== "warden" || !warden.isActive) {
    return null;
  }

  return {
    uid: warden.uid,
    name: warden.name,
  };
}

async function resolveStudentWarden(authToken: string, student: UserProfile) {
  const storedWarden = await resolveStoredWarden(authToken, student);

  if (storedWarden) {
    return {
      wardenId: storedWarden.uid,
      wardenName: storedWarden.name,
      issue: null,
    };
  }

  const wardens = await getActiveWardensForStudent(authToken, student);
  const resolution = resolveAssignedWarden(student, wardens);

  return {
    wardenId: resolution.warden?.uid ?? null,
    wardenName: resolution.warden?.name ?? null,
    issue: resolution.issue,
  };
}

async function getOutpasses(authToken: string) {
  try {
    const snapshots = await listDocuments<Record<string, unknown>>("outpasses", authToken);
    return snapshots.map((document) => serializeOutpass(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return listLocalOutpasses();
}

async function getOutpassesForStudent(authToken: string, uid: string) {
  try {
    const snapshots = await queryDocuments<Record<string, unknown>>(
      "outpasses",
      authToken,
      [{ field: "studentId", value: uid }],
      200,
    );

    return snapshots.map((document) => serializeOutpass(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return listLocalOutpasses().filter((outpass) => outpass.studentId === uid);
}

async function getOutpassesForWarden(authToken: string, uid: string) {
  try {
    const snapshots = await queryDocuments<Record<string, unknown>>(
      "outpasses",
      authToken,
      [{ field: "assignedWardenId", value: uid }],
      200,
    );

    return snapshots.map((document) => serializeOutpass(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return listLocalOutpasses().filter((outpass) => outpass.assignedWardenId === uid);
}

async function getOutpassById(authToken: string, outpassId: string) {
  try {
    const snapshot = await getDocument<Record<string, unknown>>(
      `outpasses/${outpassId}`,
      authToken,
    );

    if (snapshot) {
      return serializeOutpass(snapshot.id, snapshot.data);
    }
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return getLocalOutpass(outpassId);
}

async function getGateLogs(authToken: string) {
  try {
    const snapshots = await listDocuments<Record<string, unknown>>("gateLogs", authToken);
    return snapshots.map((document) => serializeGateLog(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return listLocalGateLogs();
}

export async function getStudentDashboard(session: AuthSession) {
  const [student, requests, config] = await Promise.all([
    getUserProfile(session.authToken, session.uid),
    getOutpassesForStudent(session.authToken, session.uid),
    getSystemConfig(session.authToken),
  ]);
  const sortedRequests = sortByCreated(requests);
  const resolvedWarden = await resolveStudentWarden(session.authToken, student);

  return {
    student:
      !student.wardenName && resolvedWarden.wardenName
        ? {
            ...student,
            wardenId: resolvedWarden.wardenId ?? student.wardenId,
            wardenName: resolvedWarden.wardenName,
          }
        : student,
    requests: sortedRequests,
    config,
    summary: summarizeOutpasses(sortedRequests),
  };
}

export async function getWardenDashboard(session: AuthSession) {
  const requests = await getOutpassesForWarden(session.authToken, session.uid);
  const sortedRequests = sortByCreated(requests);
  const students = await getUsersByIds(
    session.authToken,
    sortedRequests.map((request) => request.studentId),
  );
  const studentsById = new Map(students.map((user) => [user.uid, user]));
  const history = new Map<string, OutpassRecord[]>();

  sortedRequests.forEach((request) => {
    const group = history.get(request.studentId) ?? [];
    group.push(request);
    history.set(request.studentId, group);
  });

  return {
    requests: sortedRequests,
    summary: summarizeOutpasses(sortedRequests),
    studentsById,
    history,
  };
}

export async function getGuardDashboard(session: AuthSession) {
  const [outpasses, gateLogs] = await Promise.all([
    getOutpasses(session.authToken),
    getGateLogs(session.authToken),
  ]);
  const activeOutpasses = sortByCreated(
    outpasses.filter((item) => item.status === "approved" || item.status === "exited"),
  );

  return {
    activeOutpasses,
    gateLogsById: new Map(gateLogs.map((log) => [log.outpassId, log])),
    summary: summarizeOutpasses(activeOutpasses),
  };
}

export async function getAdminDashboard(session: AuthSession) {
  const [outpasses, users, config, gateLogs] = await Promise.all([
    getOutpasses(session.authToken),
    getUsers(session.authToken),
    getSystemConfig(session.authToken),
    getGateLogs(session.authToken),
  ]);

  return {
    outpasses: sortByCreated(outpasses),
    users: users.sort((left, right) => left.name.localeCompare(right.name)),
    config,
    gateLogs: gateLogs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    summary: summarizeOutpasses(outpasses),
  };
}

export async function getOutpassForStudent(session: AuthSession, outpassId: string) {
  const outpass = await getOutpassById(session.authToken, outpassId);
  return outpass && outpass.studentId === session.uid ? outpass : null;
}

export async function createOutpass(session: AuthSession, payload: unknown) {
  const input = parseJson(payload, createRequestSchema);
  const config = await getSystemConfig(session.authToken);
  const student = await getUserProfile(session.authToken, session.uid);

  if (!student.isActive) {
    throw new Error("This account is inactive.");
  }

  if (student.passBlocked) {
    throw new Error(
      student.passBlockReason
        ? `Outpass access is blocked: ${student.passBlockReason}`
        : "Outpass access is blocked by the admin.",
    );
  }

  const assignedWarden = await resolveStudentWarden(session.authToken, student);

  if (!assignedWarden.wardenId || !assignedWarden.wardenName) {
    throw new Error(
      assignedWarden.issue ?? "No warden assigned to this block yet. Please contact the admin.",
    );
  }

  validateRequestWindow(input, config);

  const timestamp = new Date().toISOString();
  const outpassId = randomUUID();
  const request: Omit<OutpassRecord, "id"> = {
    studentId: session.uid,
    studentName: student.name,
    studentEmail: student.email,
    studentBlock: student.hostelBlock,
    destination: input.destination,
    reason: input.reason,
    emergency: input.emergency,
    assignedWardenId: assignedWarden.wardenId,
    assignedWardenName: assignedWarden.wardenName,
    status: "pending",
    departureAt: input.departureAt,
    expectedReturnAt: input.expectedReturnAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    await setDocument(`outpasses/${outpassId}`, request, session.authToken);
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }

    upsertLocalOutpass(outpassId, request);
  }
  return { id: outpassId, ...request };
}

export async function decideOutpass(
  session: AuthSession,
  outpassId: string,
  payload: unknown,
) {
  const input = parseJson(payload, decisionSchema);
  const outpass = await getOutpassById(session.authToken, outpassId);

  if (!outpass) {
    throw new Error("The requested outpass was not found.");
  }

  if (outpass.assignedWardenId !== session.uid && session.role !== "admin") {
    throw new Error("This request belongs to another approval queue.");
  }

  if (outpass.status !== "pending") {
    throw new Error("Only pending requests can be updated.");
  }

  const timestamp = new Date().toISOString();
  const nextStatus = input.action === "approve" ? "approved" : "rejected";

  const updates = {
    status: nextStatus,
    approverRemark: input.remark,
    approvedAt: input.action === "approve" ? timestamp : null,
    rejectedAt: input.action === "reject" ? timestamp : null,
    qrToken: input.action === "approve" ? `collegegate:${outpassId}:${randomUUID()}` : null,
    updatedAt: timestamp,
  };

  try {
    await patchDocument(`outpasses/${outpassId}`, updates, session.authToken);
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }

    upsertLocalOutpass(outpassId, updates);
  }
}

export async function scanOutpass(session: AuthSession, payload: unknown) {
  const input = parseJson(payload, scanSchema);
  let matches: Array<{ id: string; data: Record<string, unknown> }> = [];

  try {
    matches = await queryDocuments<Record<string, unknown>>(
      "outpasses",
      session.authToken,
      [{ field: "qrToken", value: input.qrToken }],
      1,
    );
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }

    matches = listLocalOutpasses()
      .filter((outpass) => outpass.qrToken === input.qrToken)
      .slice(0, 1)
      .map((outpass) => ({ id: outpass.id, data: outpass as unknown as Record<string, unknown> }));
  }

  if (matches.length === 0) {
    const fallbackOutpass = await getOutpassById(session.authToken, input.qrToken);

    if (fallbackOutpass && (!fallbackOutpass.qrToken || fallbackOutpass.qrToken === input.qrToken)) {
      matches = [
        {
          id: fallbackOutpass.id,
          data: fallbackOutpass as unknown as Record<string, unknown>,
        },
      ];
    }
  }

  if (matches.length === 0) {
    throw new Error("No approved pass matches that QR token.");
  }

  const outpass = serializeOutpass(matches[0].id, matches[0].data);
  const now = new Date().toISOString();

  if (input.gateAction === "exit") {
    if (outpass.status !== "approved") {
      if (outpass.status === "exited") {
        throw new Error(
          "This student is already marked outside. Use the entry action when they return.",
        );
      }

      throw new Error("Only approved passes can be scanned at the exit gate.");
    }

    const exitUpdates = {
      status: "exited",
      exitAt: now,
      updatedAt: now,
    };

    try {
      await patchDocument(`outpasses/${outpass.id}`, exitUpdates, session.authToken);
    } catch (error) {
      if (!shouldUseLocalStore(error)) {
        throw error;
      }

      upsertLocalOutpass(outpass.id, exitUpdates);
    }

    const gateLog: GateLog = {
      id: outpass.id,
      outpassId: outpass.id,
      studentName: outpass.studentName,
      qrToken: outpass.qrToken ?? input.qrToken,
      exitAt: now,
      scannedByGuardId: session.uid,
      scannedByGuardName: session.name,
      updatedAt: now,
    };

    try {
      await setDocument(
        `gateLogs/${outpass.id}`,
        gateLog as unknown as Record<string, unknown>,
        session.authToken,
      );
    } catch (error) {
      if (!shouldUseLocalStore(error)) {
        throw error;
      }

      upsertLocalGateLog(outpass.id, gateLog as unknown as Record<string, unknown>);
    }

    return {
      nextStatus: "exited",
      message: `${outpass.studentName} marked as exited through the gate.`,
    };
  }

  if (outpass.status === "exited") {
    const returnUpdates = {
      status: "returned",
      returnedAt: now,
      updatedAt: now,
    };
    const gateUpdates = {
      returnAt: now,
      scannedByGuardId: session.uid,
      scannedByGuardName: session.name,
      updatedAt: now,
    };

    try {
      await patchDocument(`outpasses/${outpass.id}`, returnUpdates, session.authToken);
      await patchDocument(`gateLogs/${outpass.id}`, gateUpdates, session.authToken);
    } catch (error) {
      if (!shouldUseLocalStore(error)) {
        throw error;
      }

      upsertLocalOutpass(outpass.id, returnUpdates);
      upsertLocalGateLog(outpass.id, gateUpdates);
    }

    return {
      nextStatus: "returned",
      message: `${outpass.studentName} marked as returned through the gate.`,
    };
  }

  if (outpass.status === "approved") {
    throw new Error("This pass has not been used for exit yet. Use the exit action first.");
  }

  throw new Error("This pass is no longer active at the gate.");
}

export async function updateSystemConfig(session: AuthSession, payload: unknown) {
  const input = parseJson(payload, configSchema);
  const timestamp = new Date().toISOString();

  const updates = {
    ...input,
    updatedAt: timestamp,
  };

  try {
    await patchDocument("systemConfig/campus", updates, session.authToken);
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }

    setLocalSystemConfig(updates);
  }
}

export async function updateUserAccess(
  session: AuthSession,
  userId: string,
  payload: unknown,
) {
  const input = userAccessUpdateSchema.parse(payload);
  const updates: Record<string, unknown> = {};

  if (input.isActive !== undefined) {
    updates.isActive = input.isActive;
  }

  if (input.role !== undefined) {
    updates.role = input.role;
  }

  if (input.requestedRole !== undefined) {
    updates.requestedRole = input.requestedRole || null;
  }

  if (input.passBlocked !== undefined) {
    updates.passBlocked = input.passBlocked;
  }

  if (input.passBlockReason !== undefined) {
    updates.passBlockReason = input.passBlockReason || null;
  }

  if (input.penaltyCount !== undefined) {
    updates.penaltyCount = input.penaltyCount;
  }

  if (input.lastPenaltyReason !== undefined) {
    updates.lastPenaltyReason = input.lastPenaltyReason || null;
  }

  if (input.lastPenaltyAt !== undefined) {
    updates.lastPenaltyAt = input.lastPenaltyAt || null;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No user access updates were provided.");
  }

  try {
    await patchDocument(`users/${userId}`, updates, session.authToken);
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }

    upsertLocalUser(userId, updates);
  }
}

export async function buildReportPayload(session: AuthSession) {
  const outpasses = await getOutpasses(session.authToken);
  return sortByCreated(outpasses);
}

export async function buildPdfReport(records: OutpassRecord[]) {
  const pdf = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("CollegeGate Outpass Report", 40, 48);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated ${new Date().toLocaleString()}`, 40, 66);

  let y = 96;
  records.slice(0, 18).forEach((record, index) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${index + 1}. ${record.studentName} - ${record.destination}`, 40, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${record.status.toUpperCase()} | ${record.studentEmail} | Due ${record.expectedReturnAt}`,
      52,
      y + 14,
    );
    pdf.text(record.approverRemark ?? "No approval remark", 52, y + 28);
    y += 52;
  });

  return Buffer.from(pdf.output("arraybuffer"));
}

export async function buildSeedPreview() {
  return readLocalStoreSnapshot();
}

export type { UserProfile };
