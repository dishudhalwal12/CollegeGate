"use client";

import { useEffect, useEffectEvent, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  AlertCircle,
  LoaderCircle,
  LogOut,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { clientAuth } from "@/lib/firebase";
import type { OutpassRecord, SystemConfig, UserProfile } from "@/lib/collegegate";

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

function toLoginErrorMessage(cause: unknown) {
  if (cause instanceof FirebaseError) {
    switch (cause.code) {
      case "auth/invalid-credential":
      case "auth/invalid-email":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password. Use one of the seeded demo accounts shown on this page.";
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

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState({
    email: "student@collegegate.demo",
    password: "CollegeGate@123",
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const result = await signInWithEmailAndPassword(
          clientAuth,
          credentials.email,
          credentials.password,
        );
        const idToken = await result.user.getIdToken();
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        });

        const data = await readJson(response);
        router.push(data.redirectTo ?? "/student");
        router.refresh();
      } catch (cause) {
        setError(toLoginErrorMessage(cause));
      }
    });
  }

  return (
    <form className="stack-sm" onSubmit={handleSubmit}>
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

      {error ? (
        <p className="inline-feedback danger">
          <AlertCircle size={16} />
          {error}
        </p>
      ) : null}

      <button className="action-button" type="submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
        Enter CollegeGate
      </button>
    </form>
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
  const nextState = !user.isActive;

  return (
    <button
      className={user.isActive ? "ghost-button small" : "action-button small"}
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch(`/api/users/${user.uid}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive: nextState }),
          });
          await readJson(response);
          router.refresh();
        })
      }
    >
      {user.isActive ? "Deactivate" : "Activate"}
    </button>
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
