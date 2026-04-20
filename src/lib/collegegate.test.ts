import { describe, expect, it } from "vitest";
import {
  buildCsv,
  isOutpassOverdue,
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

  it("creates CSV with headers and student rows", () => {
    const csv = buildCsv([baseOutpass]);
    expect(csv).toContain("Student");
    expect(csv).toContain("Maanas Chandra");
    expect(csv).toContain("Awaiting Warden Approval");
  });
});
