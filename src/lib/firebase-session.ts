import { createPublicKey, verify as verifySignature } from "node:crypto";
import { resolveFirebaseApiKey, resolveFirebaseProjectId } from "@/lib/firebase-runtime";

type FirebaseTokenPayload = {
  aud: string;
  email?: string;
  exp: number;
  iat: number;
  iss: string;
  name?: string;
  sub: string;
  user_id?: string;
};

type FirebasePublicCertCache = {
  expiresAt: number;
  values: Record<string, string>;
};

let certCache: FirebasePublicCertCache | null = null;

function getProjectId() {
  const projectId = resolveFirebaseProjectId();

  if (!projectId) {
    throw new Error("Firebase project ID is missing.");
  }

  return projectId;
}

function decodeBase64Url(input: string) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function parseCacheMaxAge(headerValue: string | null) {
  if (!headerValue) {
    return 60 * 60;
  }

  const match = headerValue.match(/max-age=(\d+)/);
  return match ? Number(match[1]) : 60 * 60;
}

async function getPublicCerts() {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.values;
  }

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to download Firebase public signing certificates.");
  }

  const values = (await response.json()) as Record<string, string>;
  const maxAge = parseCacheMaxAge(response.headers.get("cache-control"));

  certCache = {
    values,
    expiresAt: Date.now() + maxAge * 1000,
  };

  return values;
}

export async function verifyFirebaseIdToken(idToken: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Malformed Firebase ID token.");
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8")) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as FirebaseTokenPayload;

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported Firebase token signature.");
  }

  const publicCerts = await getPublicCerts();
  const certificate = publicCerts[header.kid];

  if (!certificate) {
    throw new Error("Firebase signing key was not found.");
  }

  const verified = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey(certificate),
    decodeBase64Url(encodedSignature),
  );

  if (!verified) {
    throw new Error("Firebase ID token signature verification failed.");
  }

  const projectId = getProjectId();
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error("Firebase ID token audience does not match this project.");
  }

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Firebase ID token issuer does not match this project.");
  }

  if (!payload.sub) {
    throw new Error("Firebase ID token subject is missing.");
  }

  if (payload.exp <= nowInSeconds) {
    const expiredError = new Error("Firebase ID token expired.");
    expiredError.name = "FirebaseIdTokenExpired";
    throw expiredError;
  }

  return {
    uid: payload.sub,
    email: payload.email ?? "",
    name: payload.name ?? "",
  };
}

export async function refreshFirebaseIdToken(refreshToken: string) {
  const apiKey = resolveFirebaseApiKey();

  if (!apiKey) {
    throw new Error("Firebase API key is missing.");
  }

  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    id_token?: string;
    refresh_token?: string;
  };

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error?.message ?? "Unable to refresh the Firebase session.");
  }

  return {
    idToken: payload.id_token,
    refreshToken: payload.refresh_token ?? refreshToken,
  };
}
