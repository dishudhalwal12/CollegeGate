import { describe, expect, it } from "vitest";
import {
  buildWhatsAppLink,
  buildRegistrationProfile,
  buildCsv,
  createAssignmentKey,
  getOutpassDisciplineSignal,
  isOutpassOverdue,
  resolveAssignedWarden,
  serializeUser,
  summarizeOutpasses,
  validateRequestWindow,
  type OutpassRecord,
} from "@/lib/collegegate";
import { shouldUseLocalStore } from "@/lib/local-store";

const baseOutpass: OutpassRecord = {
  id: "one",
  studentId: "student-1",
  studentName: "Maanas Chandra",
  studentEmail: "student@collegegate.demo",
  studentBlock: "Block A",
  destination: "Home",
  reason: "Family function and overnight permission request.",
  emergency: false,
  assignedWardenId: "warden-1",
  assignedWardenName: "Radhika Sharma",
  status: "pending",
  departureAt: "2026-04-15T10:00:00.000Z",
  expectedReturnAt: "2026-04-15T14:00:00.000Z",
  createdAt: "2026-04-15T09:00:00.000Z",
  updatedAt: "2026-04-15T09:00:00.000Z",
};

const baseRegistration = {
  name: "Radhika Sharma",
  email: "warden@collegegate.demo",
  department: "Student Affairs",
  hostelBlock: "Block A",
  phone: "+91 9999999992",
} as const;

describe("collegegate domain helpers", () => {
  it("detects permission-denied errors from Firebase and wrapped responses", () => {
    expect(shouldUseLocalStore(new Error("Missing or insufficient permissions."))).toBe(true);
    expect(
      shouldUseLocalStore({
        message: "Firestore lookup failed.",
        cause: { error: { message: "Permission denied." } },
      }),
    ).toBe(true);
    expect(shouldUseLocalStore(new Error("Something unrelated happened."))).toBe(false);
  });

  it("rejects requests that exceed campus duration", () => {
    expect(() =>
      validateRequestWindow(
        {
          destination: "Home",
          reason: "Need to attend a family function after class hours.",
          departureAt: "2026-04-15T10:00:00.000Z",
          expectedReturnAt: "2026-04-16T00:00:00.000Z",
          emergency: false,
        },
        {
          maxOutpassHours: 6,
          curfewTime: "21:00",
          emergencyOverrideHours: 10,
          allowEmergencyAfterCurfew: true,
        },
      ),
    ).toThrow("exceeds");
  });

  it("marks open approved requests as overdue", () => {
    expect(
      isOutpassOverdue(
        {
          status: "approved",
          expectedReturnAt: "2026-04-15T14:00:00.000Z",
          returnedAt: undefined,
        },
        new Date("2026-04-15T18:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("summarizes pending, active, overdue, and completed records", () => {
    const summary = summarizeOutpasses([
      baseOutpass,
      { ...baseOutpass, id: "two", status: "approved" },
      {
        ...baseOutpass,
        id: "three",
        status: "returned",
        returnedAt: "2026-04-15T13:00:00.000Z",
      },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.pending).toBe(1);
    expect(summary.active).toBe(1);
    expect(summary.completed).toBe(1);
  });

  it("creates active signups for every role, including admin", () => {
    const wardenRegistration = buildRegistrationProfile(
      {
        ...baseRegistration,
        role: "warden",
      },
      "2026-04-20T10:00:00.000Z",
    );
    const adminRegistration = buildRegistrationProfile(
      {
        ...baseRegistration,
        email: "admin@collegegate.demo",
        role: "admin",
      },
      "2026-04-20T10:00:00.000Z",
    );

    expect(wardenRegistration.sessionRole).toBe("warden");
    expect(wardenRegistration.userProfile.role).toBe("warden");
    expect(wardenRegistration.userProfile.isActive).toBe(true);
    expect("requestedRole" in wardenRegistration.userProfile).toBe(false);
    expect(wardenRegistration.userProfile.assignmentKey).toBe("block-a");

    expect(adminRegistration.sessionRole).toBe("admin");
    expect(adminRegistration.userProfile.role).toBe("admin");
    expect(adminRegistration.userProfile.isActive).toBe(true);
    expect("requestedRole" in adminRegistration.userProfile).toBe(false);
    expect(adminRegistration.userProfile.passBlocked).toBe(false);
    expect(adminRegistration.userProfile.penaltyCount).toBe(0);
  });

  it("normalizes assignment keys and derives them for legacy user records", () => {
    expect(createAssignmentKey(" Block A / North Wing ")).toBe("block-a-north-wing");

    const legacyUser = serializeUser("student-2", {
      name: "Legacy Student",
      email: "legacy@collegegate.demo",
      role: "student",
      hostelBlock: "Girls Hostel - A",
      phone: "+91 9999999995",
      isActive: true,
    });

    expect(legacyUser.assignmentKey).toBe("girls-hostel-a");
  });

  it("resolves a single warden for a matching assignment block", () => {
    const resolution = resolveAssignedWarden(
      {
        hostelBlock: "Block A",
        assignmentKey: createAssignmentKey("Block A"),
      },
      [
        {
          uid: "warden-1",
          name: "Radhika Sharma",
          role: "warden",
          isActive: true,
          assignmentKey: createAssignmentKey("Block A"),
        },
      ],
    );

    expect(resolution.issue).toBeNull();
    expect(resolution.warden?.uid).toBe("warden-1");
  });

  it("reports missing or duplicate wardens for a student assignment block", () => {
    const student = {
      hostelBlock: "Block A",
      assignmentKey: createAssignmentKey("Block A"),
    };

    const missing = resolveAssignedWarden(student, []);
    const multiple = resolveAssignedWarden(student, [
      {
        uid: "warden-1",
        name: "Radhika Sharma",
        role: "warden",
        isActive: true,
        assignmentKey: student.assignmentKey,
      },
      {
        uid: "warden-2",
        name: "Anita Verma",
        role: "warden",
        isActive: true,
        assignmentKey: student.assignmentKey,
      },
    ]);

    expect(missing.issue).toContain("No warden assigned to this block");
    expect(multiple.issue).toContain("Multiple wardens configured for this block");
  });

  it("creates CSV with headers and student rows", () => {
    const csv = buildCsv([baseOutpass]);
    expect(csv).toContain("Student");
    expect(csv).toContain("Maanas Chandra");
    expect(csv).toContain("Awaiting Warden Approval");
  });

  it("flags curfew and overdue discipline signals only after the student exits", () => {
    const overdueSignal = getOutpassDisciplineSignal(
      {
        status: "exited",
        expectedReturnAt: "2026-04-15T14:00:00.000Z",
        returnedAt: undefined,
      },
      { curfewTime: "21:00" },
      new Date("2026-04-15T22:00:00.000Z"),
    );
    const curfewSignal = getOutpassDisciplineSignal(
      {
        status: "returned",
        expectedReturnAt: "2026-04-15T14:00:00+05:30",
        returnedAt: "2026-04-15T21:45:00+05:30",
      },
      { curfewTime: "21:00" },
    );
    const unusedApproval = getOutpassDisciplineSignal(
      {
        status: "approved",
        expectedReturnAt: "2026-04-15T14:00:00.000Z",
        returnedAt: undefined,
      },
      { curfewTime: "21:00" },
      new Date("2026-04-15T22:00:00.000Z"),
    );

    expect(overdueSignal.overdueOpen).toBe(true);
    expect(overdueSignal.outsideAfterCurfew).toBe(true);
    expect(curfewSignal.curfewViolation).toBe(true);
    expect(unusedApproval.hasViolation).toBe(false);
  });

  it("builds a WhatsApp deep link from a student phone number", () => {
    const link = buildWhatsAppLink("98765 43210", "Late return warning");
    expect(link).toBe("https://wa.me/919876543210?text=Late%20return%20warning");
  });
});
