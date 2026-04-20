import { resolveFirebaseProjectId } from "@/lib/firebase-runtime";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type QueryFilter = {
  field: string;
  value: unknown;
};

function getProjectId() {
  const projectId = resolveFirebaseProjectId();

  if (!projectId) {
    throw new Error("Firebase project ID is missing.");
  }

  return projectId;
}

function getFirestoreBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function encodeDocumentPath(documentPath: string) {
  return documentPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toFirestoreValue(entry)),
      },
    };
  }

  if (typeof value === "object") {
    const fields = Object.entries(value).reduce<Record<string, FirestoreValue>>(
      (accumulator, [key, entry]) => {
        if (entry !== undefined) {
          accumulator[key] = toFirestoreValue(entry);
        }

        return accumulator;
      },
      {},
    );

    return {
      mapValue: {
        fields,
      },
    };
  }

  return { stringValue: String(value) };
}

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) {
    return undefined;
  }

  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map((entry) => fromFirestoreValue(entry));

  return Object.entries(value.mapValue.fields ?? {}).reduce<Record<string, unknown>>(
    (accumulator, [key, entry]) => {
      accumulator[key] = fromFirestoreValue(entry);
      return accumulator;
    },
    {},
  );
}

function fromFirestoreDocument<T>(document: FirestoreDocument) {
  const id = document.name.split("/").pop() ?? "";
  const data = Object.entries(document.fields ?? {}).reduce<Record<string, unknown>>(
    (accumulator, [key, value]) => {
      accumulator[key] = fromFirestoreValue(value);
      return accumulator;
    },
    {},
  );

  return { id, data: data as T };
}

async function firestoreRequest<T>(
  path: string,
  authToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`${getFirestoreBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };

    throw new Error(payload.error?.message ?? "Firestore request failed.");
  }

  return (await response.json()) as T;
}

export async function getDocument<T extends Record<string, unknown>>(
  documentPath: string,
  authToken: string,
) {
  const encodedPath = encodeDocumentPath(documentPath);
  const response = await fetch(`${getFirestoreBaseUrl()}/${encodedPath}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(payload.error?.message ?? "Firestore lookup failed.");
  }

  const document = (await response.json()) as FirestoreDocument;
  return fromFirestoreDocument<T>(document);
}

export async function listDocuments<T extends Record<string, unknown>>(
  collectionId: string,
  authToken: string,
  pageSize = 200,
) {
  const result = await firestoreRequest<{ documents?: FirestoreDocument[] }>(
    `/${encodeURIComponent(collectionId)}?pageSize=${pageSize}`,
    authToken,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return (result.documents ?? []).map((document) => fromFirestoreDocument<T>(document));
}

export async function queryDocuments<T extends Record<string, unknown>>(
  collectionId: string,
  authToken: string,
  filters: QueryFilter[],
  limit = 100,
) {
  const where =
    filters.length === 1
      ? {
          fieldFilter: {
            field: {
              fieldPath: filters[0].field,
            },
            op: "EQUAL",
            value: toFirestoreValue(filters[0].value),
          },
        }
      : {
          compositeFilter: {
            op: "AND",
            filters: filters.map((filter) => ({
              fieldFilter: {
                field: {
                  fieldPath: filter.field,
                },
                op: "EQUAL",
                value: toFirestoreValue(filter.value),
              },
            })),
          },
        };

  const result = await firestoreRequest<Array<{ document?: FirestoreDocument }>>(
    ":runQuery",
    authToken,
    {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          where,
          limit,
        },
      }),
    },
  );

  return result
    .filter((entry) => entry.document)
    .map((entry) => fromFirestoreDocument<T>(entry.document as FirestoreDocument));
}

export async function setDocument(
  documentPath: string,
  data: Record<string, unknown>,
  authToken: string,
) {
  const encodedPath = encodeDocumentPath(documentPath);
  return firestoreRequest<FirestoreDocument>(`/${encodedPath}`, authToken, {
    method: "PATCH",
    body: JSON.stringify({
      fields: Object.entries(data).reduce<Record<string, FirestoreValue>>(
        (accumulator, [key, value]) => {
          if (value !== undefined) {
            accumulator[key] = toFirestoreValue(value);
          }

          return accumulator;
        },
        {},
      ),
    }),
  });
}

export async function patchDocument(
  documentPath: string,
  data: Record<string, unknown>,
  authToken: string,
) {
  const encodedPath = encodeDocumentPath(documentPath);
  const updateMask = Object.keys(data)
    .filter((key) => data[key] !== undefined)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");

  return firestoreRequest<FirestoreDocument>(
    `/${encodedPath}${updateMask ? `?${updateMask}` : ""}`,
    authToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: Object.entries(data).reduce<Record<string, FirestoreValue>>(
          (accumulator, [key, value]) => {
            if (value !== undefined) {
              accumulator[key] = toFirestoreValue(value);
            }

            return accumulator;
          },
          {},
        ),
      }),
    },
  );
}
