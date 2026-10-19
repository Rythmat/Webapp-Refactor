import SuperJSON from 'superjson';

/**
 * The console's content API from Node: the same endpoints and bodies the
 * Table's writes use (`useAdminContent.ts`, `useContentExport.ts`), with the
 * owner's admin token from `CONTENT_API_TOKEN` (copied from a /console
 * request's Authorization header; never written to disk).
 */

const API_URL = (
  process.env.CONTENT_API_URL ??
  process.env.MUSIC_ATLAS_API_URL ??
  'https://api-refactor.vercel.app'
).replace(/\/$/, '');

const BASE = `${API_URL}/api/admin/content`;

export class ContentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly body: unknown,
  ) {
    super(message);
  }
}

function token(): string {
  const raw = process.env.CONTENT_API_TOKEN?.trim();
  if (!raw)
    throw new Error(
      'CONTENT_API_TOKEN is not set: copy the Authorization header of a /console request (without "Bearer ").',
    );
  return raw.replace(/^Bearer\s+/i, '');
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* plain text */
    }
    const code =
      body && typeof body === 'object' && 'code' in body
        ? String((body as { code: unknown }).code)
        : null;
    throw new ContentApiError(
      `${init?.method ?? 'GET'} ${path}: HTTP ${res.status} ${text.slice(0, 300)}`,
      res.status,
      code,
      body,
    );
  }
  return (text ? SuperJSON.parse(text) : undefined) as T;
}

export interface Capabilities {
  kinds?: Array<string | { kind: string; schemaVersion?: number }>;
  features?: Record<string, boolean>;
  [key: string]: unknown;
}

export const capabilities = () => request<Capabilities>('/capabilities');

export interface ExportRow {
  id: string;
  slug: string;
  status: string;
  editState: string | null;
  body: Record<string, unknown> | null;
  pendingBody?: Record<string, unknown>;
  revision?: number;
}

/** Every row of one kind, working view, following the cursor. */
export async function exportKind(kind: string): Promise<ExportRow[]> {
  const out: ExportRow[] = [];
  let cursor: string | null = null;
  do {
    const after = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: { items: ExportRow[]; nextCursor: string | null } =
      await request(
        `/export?kind=${kind}&omit=sections,audioSources&limit=500${after}`,
      );
    out.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

export interface ItemDetail {
  id: string;
  slug?: string;
  body: Record<string, unknown>;
  revision?: number;
  editState?: string | null;
  pendingBody?: Record<string, unknown>;
}

export const getItem = (id: string) =>
  request<ItemDetail>(`/items/${encodeURIComponent(id)}`);

export const lookupItem = (kind: string, slug: string) =>
  request<ItemDetail>(
    `/items/lookup?kind=${kind}&slug=${encodeURIComponent(slug)}`,
  );

export interface SaveInput {
  kind: string;
  slug: string;
  body: Record<string, unknown>;
  note?: string;
  create?: boolean;
  expectedRevision?: number;
}

/** A PUT's 2xx body: `{ item, warnings }` on the contract, the bare item before it. */
export async function saveItem(
  input: SaveInput,
): Promise<{ item: ItemDetail; warnings: unknown[] }> {
  const raw = await request<unknown>('/items', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (raw && typeof raw === 'object' && 'item' in raw) {
    const { item, warnings } = raw as { item: ItemDetail; warnings?: unknown };
    return { item, warnings: Array.isArray(warnings) ? warnings : [] };
  }
  return { item: raw as ItemDetail, warnings: [] };
}
