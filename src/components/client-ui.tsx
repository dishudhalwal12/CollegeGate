"use client";

import { useEffect, useEffectEvent, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  AlertCircle,
  LoaderCircle,
  LogOut,
  QrCode,
  ScanLine,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { clientAuth } from "@/lib/firebase";
import type {
  AssignableRole,
  OutpassRecord,
  SystemConfig,
  UserProfile,
} from "@/lib/collegegate";

const signupRoles: Array<{
  value: AssignableRole;
  label: string;
  detail: string;
}> = [
  {
    value: "student",
    label: "Student",
    detail: "Instant access to request, track, and show passes.",
  },
  {
    value: "warden",
    label: "Warden",
    detail: "Approval-queue access stays pending until an admin approves it.",
  },
  {
    value: "guard",
    label: "Guard",
    detail: "Gate scanner access is requested first, then activated by admin.",
  },
  {
    value: "admin",
    label: "Admin",
    detail: "Control-room access is always held for manual approval.",
  },
] as const;

async function readJson(response: Response) {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    redirectTo?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "The request could not be completed.");
  }

  return data;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 15000,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("The request timed out. Check your Firebase setup and try again.");
    }

    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }
}

function toLoginErrorMessage(cause: unknown) {
  if (cause instanceof FirebaseError) {
    switch (cause.code) {
      case "auth/invalid-credential":
      case "auth/invalid-email":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password. Use a registered CollegeGate account.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Wait a moment and try again.";
      case "auth/configuration-not-found":
        return "Email/Password sign-in is not enabled for this Firebase project.";
      default:
        return cause.message;
    }
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return "Unable to sign in.";
}

function toRegistrationErrorMessage(cause: unknown) {
  if (cause instanceof FirebaseError) {
    switch (cause.code) {
      case "auth/email-already-in-use":
        return "That email is already registered. Try signing in instead.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Choose a stronger password with at least 6 characters.";
      case "auth/configuration-not-found":
        return "Email/Password sign-in is not enabled for this Firebase project.";
      default:
        return cause.message;
    }
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return "Unable to create your account.";
}

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [registration, setRegistration] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    hostelBlock: "",
    password: "",
    confirmPassword: "",
    role: "student" as AssignableRole,
  });

  function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const result = await signInWithEmailAndPassword(
          clientAuth,
          credentials.email,
          credentials.password,
        );
        const idToken = await result.user.getIdToken();
        const response = await fetchWithTimeout("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken,
            refreshToken: result.user.refreshToken,
          }),
        });

        const data = await readJson(response);
        router.push(data.redirectTo ?? "/");
        router.refresh();
      } catch (cause) {
        setError(toLoginErrorMessage(cause));
      }
    });
  }

  function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (registration.password.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }

    if (registration.password !== registration.confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    startTransition(async () => {
      let shouldRollbackUser = true;

      try {
        const result = await createUserWithEmailAndPassword(
          clientAuth,
          registration.email,
          registration.password,
        );
        await updateProfile(result.user, {
          displayName: registration.name,
        }).catch(() => undefined);

        const idToken = await result.user.getIdToken(true);
        await readJson(
          await fetchWithTimeout("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idToken,
              name: registration.name,
              email: registration.email,
              phone: registration.phone,
              department: registration.department,
              hostelBlock: registration.hostelBlock,
              role: registration.role,
            }),
          }),
        );

        shouldRollbackUser = false;

        const sessionResponse = await fetchWithTimeout("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken,
            refreshToken: result.user.refreshToken,
          }),
        });

        const data = await readJson(sessionResponse);
        setMessage(
          registration.role === "student"
            ? "Your account is ready."
            : "Your access request has been submitted for approval.",
        );
        router.push(data.redirectTo ?? "/");
        router.refresh();
      } catch (cause) {
        if (shouldRollbackUser && clientAuth.currentUser) {
          await clientAuth.currentUser.delete().catch(() => undefined);
        }

        setError(toRegistrationErrorMessage(cause));
      }
    });
  }

  const isStaffSignup = registration.role !== "student";

  return (
    <div className="stack-sm">
      <div className="auth-switch">
        <button
          className={mode === "signup" ? "auth-switch-button active" : "auth-switch-button"}
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
            setMessage("");
          }}
        >
          Create Account
        </button>
        <button
          className={mode === "signin" ? "auth-switch-button active" : "auth-switch-button"}
          type="button"
          onClick={() => {
            setMode("signin");
            setError("");
            setMessage("");
          }}
        >
          Sign In
        </button>
      </div>

      {mode === "signin" ? (
        <form className="stack-sm" onSubmit={handleSignIn}>
          <label className="form-field">
            <span>Email</span>
            <input
              value={credentials.email}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="action-button" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
            Enter CollegeGate
          </button>
        </form>
      ) : (
        <form className="stack-sm" onSubmit={handleSignUp}>
          <div className="form-grid">
            <label className="form-field">
              <span>Full Name</span>
              <input
                value={registration.name}
                onChange={(event) =>
                  setRegistration((current) => ({ ...current, name: event.target.value }))
                }
                type="text"
                name="name"
                autoComplete="name"
                required
              />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input
                value={registration.email}
                onChange={(event) =>
                  setRegistration((current) => ({ ...current, email: event.target.value }))
                }
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input
                value={registration.phone}
                onChange={(event) =>
                  setRegistration((current) => ({ ...current, phone: event.target.value }))
                }
                type="tel"
                name="phone"
                autoComplete="tel"
                required
              />
            </label>
            <label className="form-field">
              <span>Department</span>
              <input
                value={registration.department}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    department: event.target.value,
                  }))
                }
                type="text"
                name="department"
                required
              />
            </label>
            <label className="form-field">
              <span>Hostel Block / Duty Station</span>
              <input
                value={registration.hostelBlock}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    hostelBlock: event.target.value,
                  }))
                }
                type="text"
                name="hostelBlock"
                required
              />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input
                value={registration.password}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                type="password"
                name="password"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="form-field">
              <span>Confirm Password</span>
              <input
                value={registration.confirmPassword}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <div className="stack-xs">
            <span className="micro-copy">Choose your access</span>
            <div className="role-picker">
              {signupRoles.map((option) => (
                <label
                  className={
                    registration.role === option.value
                      ? "role-option active"
                      : "role-option"
                  }
                  key={option.value}
                >
                  <input
                    checked={registration.role === option.value}
                    className="role-option-input"
                    name="role"
                    type="radio"
                    value={option.value}
                    onChange={(event) =>
                      setRegistration((current) => ({
                        ...current,
                        role: event.target.value as AssignableRole,
                      }))
                    }
                  />
                  <div className="role-option-copy">
                    <strong className="role-option-title">{option.label}</strong>
                    <p className="role-option-detail">{option.detail}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {isStaffSignup ? (
            <p className="inline-feedback">
              <UserRoundPlus size={16} />
              Staff and admin accounts are created as approval requests first. They unlock after an
              admin reviews them.
            </p>
          ) : null}

          <button className="action-button" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <UserRoundPlus size={16} />}
            Create CollegeGate Account
          </button>
        </form>
      )}

      {message ? (
        <p className="inline-feedback success">
          <ShieldCheck size={16} />
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="inline-feedback danger">
          <AlertCircle size={16} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="ghost-button"
      type="button"
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          await clientAuth.signOut().catch(() => undefined);
          router.push("/login");
          router.refresh();
        })
      }
      disabled={isPending}
    >
      {isPending ? <LoaderCircle className="spin" size={16} /> : <LogOut size={16} />}
      Logout
    </button>
  );
}

export function StudentRequestForm({ config }: { config: SystemConfig }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    destination: "Home",
    reason: "",
    departureAt: "",
    expectedReturnAt: "",
    emergency: false,
  });

  function updateField(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedDestination = form.destination.trim();
    const trimmedReason = form.reason.trim();

    if (trimmedDestination.length < 2) {
      setError("Destination must be at least 2 characters long.");
      return;
    }

    if (trimmedReason.length < 10) {
      setError("Reason must be at least 10 characters long.");
      return;
    }

    if (!form.departureAt || !form.expectedReturnAt) {
      setError("Choose both departure and expected return times.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/outpasses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            destination: trimmedDestination,
            reason: trimmedReason,
            departureAt: new Date(form.departureAt).toISOString(),
            expectedReturnAt: new Date(form.expectedReturnAt).toISOString(),
          }),
        });

        await readJson(response);
        setForm({
          destination: "Home",
          reason: "",
          departureAt: "",
          expectedReturnAt: "",
          emergency: false,
        });
        setSuccess("Your outpass request is now in the warden approval queue.");
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "The request could not be submitted.",
        );
      }
    });
  }

  return (
    <form className="panel-form" onSubmit={handleSubmit}>
      <div className="stack-xs">
        <p className="micro-copy">Campus rule snapshot</p>
        <p className="helper-copy">
          Max duration {config.maxOutpassHours}h, curfew at {config.curfewTime}, emergency
          override {config.emergencyOverrideHours}h.
        </p>
      </div>

      <div className="form-grid">
        <label className="form-field">
          <span>Destination</span>
          <input
            value={form.destination}
            onChange={(event) => updateField("destination", event.target.value)}
            name="destination"
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label className="form-field">
          <span>Departure Time</span>
          <input
            value={form.departureAt}
            onChange={(event) => updateField("departureAt", event.target.value)}
            type="datetime-local"
            name="departureAt"
            required
          />
        </label>
        <label className="form-field">
          <span>Expected Return</span>
          <input
            value={form.expectedReturnAt}
            onChange={(event) => updateField("expectedReturnAt", event.target.value)}
            type="datetime-local"
            name="expectedReturnAt"
            required
          />
        </label>
        <label className="form-field wide">
          <span>Reason</span>
          <textarea
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            name="reason"
            rows={4}
            minLength={10}
            maxLength={280}
            required
          />
        </label>
        <label className="toggle-field">
          <input
            checked={form.emergency}
            onChange={(event) => updateField("emergency", event.target.checked)}
            type="checkbox"
            name="emergency"
          />
          <span>Mark as emergency outpass</span>
        </label>
      </div>

      {error ? <p className="inline-feedback danger">{error}</p> : null}
      {success ? <p className="inline-feedback success">{success}</p> : null}

      <button className="action-button" type="submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="spin" size={16} /> : <QrCode size={16} />}
        Submit Request
      </button>
    </form>
  );
}

export function DecisionForm({ outpassId }: { outpassId: string }) {
  const router = useRouter();
  const [remark, setRemark] = useState("Return within the approved window.");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(action: "approve" | "reject") {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/outpasses/${outpassId}/decision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, remark }),
        });
        await readJson(response);
        setMessage(
          action === "approve" ? "Request approved and QR token generated." : "Request rejected.",
        );
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update request.");
      }
    });
  }

  return (
    <div className="stack-xs">
      <textarea
        className="mini-textarea"
        value={remark}
        onChange={(event) => setRemark(event.target.value)}
        rows={3}
      />
      <div className="action-row">
        <button
          className="action-button small"
          type="button"
          onClick={() => submit("approve")}
          disabled={isPending}
        >
          Approve
        </button>
        <button
          className="ghost-button small"
          type="button"
          onClick={() => submit("reject")}
          disabled={isPending}
        >
          Reject
        </button>
      </div>
      {message ? <p className="inline-feedback success">{message}</p> : null}
      {error ? <p className="inline-feedback danger">{error}</p> : null}
    </div>
  );
}

export function ConfigForm({ config }: { config: SystemConfig }) {
  const router = useRouter();
  const [form, setForm] = useState(config);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateField(name: keyof SystemConfig, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [name]:
        typeof current[name] === "number"
          ? Number(value)
          : value,
    }));
  }

  return (
    <form
      className="panel-form"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");
        setError("");
        startTransition(async () => {
          try {
            const response = await fetch("/api/config", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            await readJson(response);
            setMessage("Campus rules updated.");
            router.refresh();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to update rules.");
          }
        });
      }}
    >
      <div className="form-grid compact">
        <label className="form-field">
          <span>Max Outpass Hours</span>
          <input
            value={form.maxOutpassHours}
            onChange={(event) => updateField("maxOutpassHours", event.target.value)}
            type="number"
            min={1}
            max={24}
          />
        </label>
        <label className="form-field">
          <span>Curfew Time</span>
          <input
            value={form.curfewTime}
            onChange={(event) => updateField("curfewTime", event.target.value)}
            type="time"
          />
        </label>
        <label className="form-field">
          <span>Emergency Override Hours</span>
          <input
            value={form.emergencyOverrideHours}
            onChange={(event) =>
              updateField("emergencyOverrideHours", event.target.value)
            }
            type="number"
            min={1}
            max={48}
          />
        </label>
        <label className="toggle-field">
          <input
            checked={form.allowEmergencyAfterCurfew}
            onChange={(event) =>
              updateField("allowEmergencyAfterCurfew", event.target.checked)
            }
            type="checkbox"
          />
          <span>Allow emergency approvals after curfew</span>
        </label>
      </div>
      {message ? <p className="inline-feedback success">{message}</p> : null}
      {error ? <p className="inline-feedback danger">{error}</p> : null}
      <button className="action-button" type="submit" disabled={isPending}>
        Save Rules
      </button>
    </form>
  );
}

export function UserStatusToggle({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<AssignableRole>(
    user.role === "pending" ? user.requestedRole ?? "student" : (user.role as AssignableRole),
  );
  const [error, setError] = useState("");
  const isPendingApproval = user.role === "pending";

  function updateAccess(payload: Record<string, unknown>) {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${user.uid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        await readJson(response);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update access.");
      }
    });
  }

  return (
    <div className="stack-xs">
      {isPendingApproval ? (
        <>
          <label className="form-field">
            <span>Approve As</span>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as AssignableRole)}
            >
              {signupRoles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="action-row">
            <button
              className="action-button small"
              type="button"
              disabled={isPending}
              onClick={() =>
                updateAccess({
                  role: selectedRole,
                  isActive: true,
                  requestedRole: "",
                })
              }
            >
              Approve Access
            </button>
            <button
              className="ghost-button small"
              type="button"
              disabled={isPending}
              onClick={() => updateAccess({ isActive: false })}
            >
              Keep Pending
            </button>
          </div>
        </>
      ) : (
        <button
          className={user.isActive ? "ghost-button small" : "action-button small"}
          type="button"
          disabled={isPending}
          onClick={() => updateAccess({ isActive: !user.isActive })}
        >
          {user.isActive ? "Deactivate" : "Activate"}
        </button>
      )}
      {error ? <p className="inline-feedback danger">{error}</p> : null}
    </div>
  );
}

export function ScannerPanel({
  activeOutpasses,
}: {
  activeOutpasses: OutpassRecord[];
}) {
  const scannerId = useId().replaceAll(":", "");
  const router = useRouter();
  const [token, setToken] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleDetected = useEffectEvent((decodedText: string) => {
    setToken(decodedText);
    setCameraEnabled(false);
    submit(decodedText);
  });

  useEffect(() => {
    if (!cameraEnabled) {
      return;
    }

    let mounted = true;
    let scanner: {
      render: (
        success: (decodedText: string) => void,
        failure: (errorMessage: string) => void,
      ) => void;
      clear: () => Promise<void>;
    } | null = null;

    void import("html5-qrcode")
      .then(({ Html5QrcodeScanner }) => {
        if (!mounted) return;
        scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          false,
        );
        scanner.render(
          (decodedText) => handleDetected(decodedText),
          () => undefined,
        );
      })
      .catch(() => {
        setError("Camera scanning could not start on this browser.");
        setCameraEnabled(false);
      });

    return () => {
      mounted = false;
      if (scanner) {
        void scanner.clear().catch(() => undefined);
      }
    };
  }, [cameraEnabled, scannerId]);

  function submit(qrToken = token) {
    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/guard/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ qrToken }),
        });
        const data = await readJson(response);
        setMessage(data.message ?? "Gate state updated.");
        setToken("");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to validate QR.");
      }
    });
  }

  return (
    <div className="stack-sm">
      <div className="scan-surface">
        <div className="scan-topline">
          <span>Ready for active passes</span>
          <strong>{activeOutpasses.length}</strong>
        </div>
        <div id={scannerId} className="scanner-box" />
        <div className="action-row">
          <button
            className="action-button"
            type="button"
            onClick={() => setCameraEnabled((current) => !current)}
          >
            <ScanLine size={16} />
            {cameraEnabled ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
        <form
          className="stack-xs"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="form-field">
            <span>Manual QR token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste a token if the camera is unavailable"
              required
            />
          </label>
          <button className="ghost-button" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <QrCode size={16} />}
            Validate Pass
          </button>
        </form>
        {message ? <p className="inline-feedback success">{message}</p> : null}
        {error ? <p className="inline-feedback danger">{error}</p> : null}
      </div>
    </div>
  );
}
