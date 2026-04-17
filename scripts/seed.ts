import { randomUUID } from "node:crypto";
import { requireAdminSdk } from "../src/lib/firebase-admin";

async function upsertAuthUser(
  email: string,
  password: string,
  displayName: string,
) {
  const { adminAuth } = requireAdminSdk("seed auth users");

  try {
    return await adminAuth.getUserByEmail(email);
  } catch {
    return adminAuth.createUser({
      email,
      password,
      displayName,
    });
  }
}

async function main() {
  const { adminDb } = requireAdminSdk("seed database");
  const timestamp = new Date().toISOString();

  const seeded = [
    {
      email: "student@collegegate.demo",
      password: "CollegeGate@123",
      name: "Maanas Chandra",
      role: "student",
      department: "BCA Semester VI",
      hostelBlock: "Block A",
      phone: "+91 9999999991",
    },
    {
      email: "warden@collegegate.demo",
      password: "CollegeGate@123",
      name: "Radhika Sharma",
      role: "warden",
      department: "Student Affairs",
      hostelBlock: "Girls Hostel",
      phone: "+91 9999999992",
    },
    {
      email: "guard@collegegate.demo",
      password: "CollegeGate@123",
      name: "Rajesh Kumar",
      role: "guard",
      department: "Security",
      hostelBlock: "Main Gate",
      phone: "+91 9999999993",
    },
    {
      email: "admin@collegegate.demo",
      password: "CollegeGate@123",
      name: "Campus Admin",
      role: "admin",
      department: "Administration",
      hostelBlock: "Control Room",
      phone: "+91 9999999994",
    },
  ] as const;

  const authUsers = await Promise.all(
    seeded.map((entry) => upsertAuthUser(entry.email, entry.password, entry.name)),
  );

  const warden = authUsers.find((user) => user.email === "warden@collegegate.demo");

  await Promise.all(
    authUsers.map((authUser, index) =>
      adminDb
        .collection("users")
        .doc(authUser.uid)
        .set(
          {
            name: seeded[index].name,
            email: seeded[index].email,
            role: seeded[index].role,
            department: seeded[index].department,
            hostelBlock: seeded[index].hostelBlock,
            phone: seeded[index].phone,
            wardenId:
              seeded[index].role === "student" && warden ? warden.uid : undefined,
            wardenName:
              seeded[index].role === "student" && warden ? warden.displayName : undefined,
            isActive: true,
            createdAt: timestamp,
          },
          { merge: true },
        ),
    ),
  );

  await adminDb.collection("systemConfig").doc("campus").set(
    {
      maxOutpassHours: 6,
      curfewTime: "21:00",
      emergencyOverrideHours: 10,
      allowEmergencyAfterCurfew: true,
      updatedAt: timestamp,
    },
    { merge: true },
  );

  const student = authUsers.find((user) => user.email === "student@collegegate.demo");
  if (!student || !warden) {
    throw new Error("Seed accounts were not created correctly.");
  }

  const sampleOutpasses = [
    {
      destination: "Home",
      reason: "Family visit and dinner with parents.",
      emergency: false,
      status: "approved",
      departureAt: "2026-04-16T11:00:00.000Z",
      expectedReturnAt: "2026-04-16T18:00:00.000Z",
      approverRemark: "Show QR at the main gate and return before 6 PM.",
    },
    {
      destination: "Hospital",
      reason: "Emergency medical consultation.",
      emergency: true,
      status: "exited",
      departureAt: "2026-04-15T09:00:00.000Z",
      expectedReturnAt: "2026-04-15T14:00:00.000Z",
      approverRemark: "Emergency pass approved.",
      exitAt: "2026-04-15T09:12:00.000Z",
    },
    {
      destination: "Market",
      reason: "Purchase academic supplies.",
      emergency: false,
      status: "returned",
      departureAt: "2026-04-14T10:00:00.000Z",
      expectedReturnAt: "2026-04-14T13:00:00.000Z",
      approverRemark: "Approved for midday outing.",
      exitAt: "2026-04-14T10:10:00.000Z",
      returnedAt: "2026-04-14T12:32:00.000Z",
    },
  ];

  for (const sample of sampleOutpasses) {
    const reference = adminDb.collection("outpasses").doc();
    const qrToken =
      sample.status === "approved" || sample.status === "exited" || sample.status === "returned"
        ? `collegegate:${reference.id}:${randomUUID()}`
        : undefined;

    await reference.set({
      studentId: student.uid,
      studentName: student.displayName,
      studentEmail: student.email,
      studentBlock: "Block A",
      destination: sample.destination,
      reason: sample.reason,
      emergency: sample.emergency,
      assignedWardenId: warden.uid,
      assignedWardenName: warden.displayName,
      status: sample.status,
      departureAt: sample.departureAt,
      expectedReturnAt: sample.expectedReturnAt,
      approverRemark: sample.approverRemark,
      qrToken,
      createdAt: timestamp,
      updatedAt: timestamp,
      approvedAt: timestamp,
      exitAt: sample.exitAt,
      returnedAt: sample.returnedAt,
    });

    if (sample.exitAt) {
      await adminDb.collection("gateLogs").doc(reference.id).set({
        outpassId: reference.id,
        studentName: student.displayName,
        qrToken,
        exitAt: sample.exitAt,
        returnAt: sample.returnedAt,
        scannedByGuardId:
          authUsers.find((user) => user.email === "guard@collegegate.demo")?.uid ?? "",
        scannedByGuardName: "Rajesh Kumar",
        updatedAt: timestamp,
      });
    }
  }

  console.log("Seed complete. Demo credentials:");
  seeded.forEach((entry) => {
    console.log(`${entry.role}: ${entry.email} / ${entry.password}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
