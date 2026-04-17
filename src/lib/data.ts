import { randomUUID } from "node:crypto";
import { jsPDF } from "jspdf";
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
  userStatusSchema,
  validateRequestWindow,
  type GateLog,
  type OutpassRecord,
  type SessionUser,
  type SystemConfig,
} from "@/lib/collegegate";
import { ensureDemoAccounts } from "@/lib/demo-users";
import { requireAdminSdk } from "@/lib/firebase-admin";

async function getCollection<T>(
  path: string,
  serializer: (id: string, data: Record<string, unknown>) => T,
) {
  const { adminDb } = requireAdminSdk(path);
  const snapshot = await adminDb.collection(path).get();
  return snapshot.docs.map((doc) => serializer(doc.id, doc.data()));
}

export async function getUserProfile(uid: string) {
  const { adminDb } = requireAdminSdk("user lookup");
  const snapshot = await adminDb.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    throw new Error("The user profile was not found in Firestore.");
  }

  return serializeUser(snapshot.id, snapshot.data() ?? {});
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const { adminDb } = requireAdminSdk("system config");
  const snapshot = await adminDb.collection("systemConfig").doc("campus").get();

  if (!snapshot.exists) {
    return defaultSystemConfig;
  }

  return {
    ...defaultSystemConfig,
    ...(snapshot.data() as Partial<SystemConfig>),
  };
}

export async function getOutpasses() {
  return getCollection("outpasses", serializeOutpass);
}

export async function getUsers() {
  return getCollection("users", serializeUser);
}

export async function getGateLogs() {
  return getCollection("gateLogs", serializeGateLog);
}

export async function getStudentDashboard(uid: string) {
  const [student, outpasses, config, users] = await Promise.all([
    getUserProfile(uid),
    getOutpasses(),
    getSystemConfig(),
    getUsers(),
  ]);
  const requests = sortByCreated(outpasses.filter((item) => item.studentId === uid));
  const fallbackWarden = users.find((user) => user.role === "warden");

  if (!student.wardenId && fallbackWarden) {
    student.wardenId = fallbackWarden.uid;
  }

  if (!student.wardenName && fallbackWarden) {
    student.wardenName = fallbackWarden.name;
  }

  return {
    student,
    requests,
    config,
    summary: summarizeOutpasses(requests),
  };
}

export async function getWardenDashboard(uid: string) {
  const [outpasses, users] = await Promise.all([getOutpasses(), getUsers()]);
  const requests = sortByCreated(
    outpasses.filter((item) => item.assignedWardenId === uid),
  );
  const studentsById = new Map(users.map((user) => [user.uid, user]));
  const history = new Map<string, OutpassRecord[]>();

  requests.forEach((request) => {
    const group = history.get(request.studentId) ?? [];
    group.push(request);
    history.set(request.studentId, group);
  });

  return {
    requests,
    summary: summarizeOutpasses(requests),
    studentsById,
    history,
  };
}

export async function getGuardDashboard() {
  const [outpasses, gateLogs] = await Promise.all([getOutpasses(), getGateLogs()]);
  const activeOutpasses = sortByCreated(
    outpasses.filter(
      (item) => item.status === "approved" || item.status === "exited",
    ),
  );

  return {
    activeOutpasses,
    gateLogsById: new Map(gateLogs.map((log) => [log.outpassId, log])),
    summary: summarizeOutpasses(activeOutpasses),
  };
}

export async function getAdminDashboard() {
  const [outpasses, users, config, gateLogs] = await Promise.all([
    getOutpasses(),
    getUsers(),
    getSystemConfig(),
    getGateLogs(),
  ]);

  return {
    outpasses: sortByCreated(outpasses).slice(0, 16),
    users: users.sort((left, right) => left.name.localeCompare(right.name)),
    config,
    gateLogsById: new Map(gateLogs.map((log) => [log.outpassId, log])),
    summary: summarizeOutpasses(outpasses),
  };
}

export async function getOutpassForStudent(uid: string, outpassId: string) {
  const { adminDb } = requireAdminSdk("pass lookup");
  const snapshot = await adminDb.collection("outpasses").doc(outpassId).get();

  if (!snapshot.exists) {
    return null;
  }

  const outpass = serializeOutpass(snapshot.id, snapshot.data() ?? {});
  return outpass.studentId === uid ? outpass : null;
}

export async function createOutpass(
  session: SessionUser,
  payload: unknown,
) {
  const input = parseJson(payload, createRequestSchema);
  const { adminAuth, adminDb } = requireAdminSdk("outpass creation");
  const config = await getSystemConfig();
  let student = await getUserProfile(session.uid);

  if (!student.wardenId || !student.wardenName) {
    if (student.email.endsWith("@collegegate.demo")) {
      await ensureDemoAccounts(adminAuth, adminDb);
      student = await getUserProfile(session.uid);
    }

    const users = await getUsers();
    const fallbackWarden = users.find((user) => user.role === "warden");

    if (!fallbackWarden) {
      throw new Error("No warden account is available for approvals.");
    }

    student.wardenId = fallbackWarden.uid;
    student.wardenName = fallbackWarden.name;

    await adminDb.collection("users").doc(student.uid).set(
      {
        wardenId: student.wardenId,
        wardenName: student.wardenName,
      },
      { merge: true },
    );
  }

  if (!student.isActive) {
    throw new Error("This account is inactive.");
  }

  validateRequestWindow(input, config);

  const timestamp = new Date().toISOString();
  const reference = adminDb.collection("outpasses").doc();

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

  await reference.set(request);
  return { id: reference.id, ...request };
}

export async function decideOutpass(
  session: SessionUser,
  outpassId: string,
  payload: unknown,
) {
  const input = parseJson(payload, decisionSchema);
  const { adminDb } = requireAdminSdk("outpass decision");
  const reference = adminDb.collection("outpasses").doc(outpassId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    throw new Error("The requested outpass was not found.");
  }

  const outpass = serializeOutpass(snapshot.id, snapshot.data() ?? {});

  if (outpass.assignedWardenId !== session.uid && session.role !== "admin") {
    throw new Error("This request belongs to another approval queue.");
  }

  if (outpass.status !== "pending") {
    throw new Error("Only pending requests can be updated.");
  }

  const timestamp = new Date().toISOString();
  const nextStatus = input.action === "approve" ? "approved" : "rejected";

  await reference.update({
    status: nextStatus,
    approverRemark: input.remark,
    approvedAt: input.action === "approve" ? timestamp : null,
    rejectedAt: input.action === "reject" ? timestamp : null,
    qrToken:
      input.action === "approve"
        ? `collegegate:${outpassId}:${randomUUID()}`
        : null,
    updatedAt: timestamp,
  });
}

export async function scanOutpass(
  session: SessionUser,
  payload: unknown,
) {
  const input = parseJson(payload, scanSchema);
  const { adminDb } = requireAdminSdk("guard scan");
  const snapshot = await adminDb
    .collection("outpasses")
    .where("qrToken", "==", input.qrToken)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("No approved pass matches that QR token.");
  }

  const document = snapshot.docs[0];
  const outpass = serializeOutpass(document.id, document.data());
  const now = new Date().toISOString();
  const gateLogRef = adminDb.collection("gateLogs").doc(outpass.id);

  if (outpass.status === "approved") {
    await document.ref.update({
      status: "exited",
      exitAt: now,
      updatedAt: now,
    });

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

    await gateLogRef.set(gateLog);

    return {
      nextStatus: "exited",
      message: `${outpass.studentName} marked as exited.`,
    };
  }

  if (outpass.status === "exited") {
    await document.ref.update({
      status: "returned",
      returnedAt: now,
      updatedAt: now,
    });

    await gateLogRef.set(
      {
        returnAt: now,
        scannedByGuardId: session.uid,
        scannedByGuardName: session.name,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      nextStatus: "returned",
      message: `${outpass.studentName} marked as returned.`,
    };
  }

  throw new Error("This pass is no longer active at the gate.");
}

export async function updateSystemConfig(payload: unknown) {
  const input = parseJson(payload, configSchema);
  const { adminDb } = requireAdminSdk("config update");
  const timestamp = new Date().toISOString();

  await adminDb.collection("systemConfig").doc("campus").set(
    {
      ...input,
      updatedAt: timestamp,
    },
    { merge: true },
  );
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const input = userStatusSchema.parse({ isActive });
  const { adminDb } = requireAdminSdk("user update");

  await adminDb
    .collection("users")
    .doc(userId)
    .set({ isActive: input.isActive }, { merge: true });
}

export async function buildReportPayload() {
  const outpasses = await getOutpasses();
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
  const [users, outpasses, config] = await Promise.all([
    getUsers(),
    getOutpasses(),
    getSystemConfig(),
  ]);

  return {
    users,
    outpasses,
    config,
  };
}
