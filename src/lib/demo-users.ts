import "server-only";

import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { createAssignmentKey, type UserRole } from "@/lib/collegegate";

type DemoRoleConfig = {
  role: UserRole;
  email: string;
  password: string;
  name: string;
  department: string;
  hostelBlock: string;
  phone: string;
};

export const demoRoleConfigs: DemoRoleConfig[] = [
  {
    role: "student",
    email: "student@collegegate.demo",
    password: "CollegeGate@123",
    name: "Maanas Chandra",
    department: "BCA Semester VI",
    hostelBlock: "Block A",
    phone: "+91 9999999991",
  },
  {
    role: "warden",
    email: "warden@collegegate.demo",
    password: "CollegeGate@123",
    name: "Radhika Sharma",
    department: "Student Affairs",
    hostelBlock: "Block A",
    phone: "+91 9999999992",
  },
  {
    role: "guard",
    email: "guard@collegegate.demo",
    password: "CollegeGate@123",
    name: "Rajesh Kumar",
    department: "Security",
    hostelBlock: "Main Gate",
    phone: "+91 9999999993",
  },
  {
    role: "admin",
    email: "admin@collegegate.demo",
    password: "CollegeGate@123",
    name: "Campus Admin",
    department: "Administration",
    hostelBlock: "Control Room",
    phone: "+91 9999999994",
  },
] as const;

function isAuthUserNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}

export function getDemoProfileDefaults(email: string) {
  const normalized = email.trim().toLowerCase();
  return demoRoleConfigs.find((config) => config.email === normalized) ?? null;
}

export async function ensureDemoAccounts(adminAuth: Auth, adminDb: Firestore) {
  const authUsers = new Map<UserRole, { uid: string; email?: string | null; displayName?: string | null }>();

  for (const config of demoRoleConfigs) {
    try {
      const user = await adminAuth.getUserByEmail(config.email);
      authUsers.set(config.role, user);
    } catch (error) {
      if (!isAuthUserNotFound(error)) {
        throw error;
      }

      const createdUser = await adminAuth.createUser({
        email: config.email,
        password: config.password,
        displayName: config.name,
      });

      authUsers.set(config.role, createdUser);
    }
  }

  const timestamp = new Date().toISOString();
  const warden = authUsers.get("warden");

  await Promise.all(
    demoRoleConfigs.map(async (config) => {
      const authUser = authUsers.get(config.role);

      if (!authUser) {
        return;
      }

      await adminDb
        .collection("users")
        .doc(authUser.uid)
        .set(
          {
            name: config.name,
            email: config.email,
            role: config.role,
            department: config.department,
            hostelBlock: config.hostelBlock,
            assignmentKey: createAssignmentKey(config.hostelBlock),
            phone: config.phone,
            ...(config.role === "student"
              ? {
                  wardenId: warden?.uid ?? "",
                  wardenName: warden?.displayName ?? "Radhika Sharma",
                }
              : {}),
            isActive: true,
            createdAt: timestamp,
          },
          { merge: true },
        );
    }),
  );
}
