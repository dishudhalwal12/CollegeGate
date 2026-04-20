import { randomUUID } from "node:crypto";
import { jsPDF } from "jspdf";
import type { AuthSession } from "@/lib/auth";
import {
  configSchema,
  createRequestSchema,
  decisionSchema,
  defaultSystemConfig,
  parseJson,
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
  getFirstActiveLocalUser,
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

async function getUserProfile(authToken: string, uid: string) {
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

  const localUser = getLocalUser(uid);

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

async function getUsersForWarden(authToken: string, wardenId: string) {
  try {
    const snapshots = await queryDocuments<Record<string, unknown>>(
      "users",
      authToken,
      [
        { field: "wardenId", value: wardenId },
        { field: "role", value: "student" },
      ],
      200,
    );

    return snapshots.map((document) => serializeUser(document.id, document.data));
  } catch (error) {
    if (!shouldUseLocalStore(error)) {
      throw error;
    }
  }

  return listLocalUsers().filter(
    (user) => user.role === "student" && user.wardenId === wardenId,
  );
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

  return {
    student,
    requests: sortedRequests,
    config,
    summary: summarizeOutpasses(sortedRequests),
  };
}

export async function getWardenDashboard(session: AuthSession) {
  const [requests, students] = await Promise.all([
    getOutpassesForWarden(session.authToken, session.uid),
    getUsersForWarden(session.authToken, session.uid),
  ]);
  const sortedRequests = sortByCreated(requests);
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
    outpasses: sortByCreated(outpasses).slice(0, 16),
    users: users.sort((left, right) => left.name.localeCompare(right.name)),
    config,
    gateLogsById: new Map(gateLogs.map((log) => [log.outpassId, log])),
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

  if (!student.wardenId || !student.wardenName) {
    const fallbackWarden = getFirstActiveLocalUser("warden");

    if (fallbackWarden) {
      student.wardenId = fallbackWarden.uid;
      student.wardenName = fallbackWarden.name;
      upsertLocalUser(student.uid, {
        wardenId: student.wardenId,
        wardenName: student.wardenName,
      });
    } else {
      throw new Error("Your account is waiting for warden assignment before you can request an outpass.");
    }
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
    assignedWardenId: student.wardenId,
    assignedWardenName: student.wardenName,
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
    throw new Error("No approved pass matches that QR token.");
  }

  const outpass = serializeOutpass(matches[0].id, matches[0].data);
  const now = new Date().toISOString();

  if (outpass.status === "approved") {
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
      message: `${outpass.studentName} marked as exited.`,
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
      message: `${outpass.studentName} marked as returned.`,
    };
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
