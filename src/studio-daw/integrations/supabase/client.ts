import { jwtDecode } from 'jwt-decode';
import { Env } from '@/constants/env';

type Row = Record<string, any>;
type Filter = { type: 'eq' | 'contains'; key: string; value: any };
type QueryResult = { data: any; error: { message: string } | null };

type SessionUser = { id: string; email?: string };

const PROJECTS_KEY = 'studio_daw_projects';
const REFERENCE_TRACKS_KEY = 'studio_daw_reference_tracks';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getUserFromToken(): SessionUser | null {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<{ user_id: string; username?: string; email?: string }>(token);
    if (!decoded.user_id) return null;
    return { id: decoded.user_id, email: decoded.email || decoded.username };
  } catch {
    return null;
  }
}

function readTable(key: string): Row[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTable(key: string, rows: Row[]): void {
  localStorage.setItem(key, JSON.stringify(rows));
}

function mapTable(table: string): string {
  if (table === 'projects') return PROJECTS_KEY;
  if (table === 'reference_tracks') return REFERENCE_TRACKS_KEY;
  return table;
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) =>
    filters.every((f) => {
      if (f.type === 'eq') return row[f.key] === f.value;
      if (f.type === 'contains') {
        const value = row[f.key];
        if (!Array.isArray(value)) return false;
        const query = Array.isArray(f.value) ? f.value : [f.value];
        return query.every((item) => value.includes(item));
      }
      return true;
    }),
  );
}

class QueryBuilder {
  private readonly storageKey: string;
  private filters: Filter[] = [];
  private orderBy?: { key: string; ascending: boolean };
  private updatePayload?: Row;
  private insertPayload?: Row[];
  private doDelete = false;

  constructor(table: string) {
    this.storageKey = mapTable(table);
  }

  select(_columns?: string) {
    return this;
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.orderBy = { key, ascending: options?.ascending ?? true };
    return this;
  }

  eq(key: string, value: any) {
    this.filters.push({ type: 'eq', key, value });
    return this;
  }

  contains(key: string, value: any) {
    this.filters.push({ type: 'contains', key, value });
    return this;
  }

  or(_query: string) {
    return this;
  }

  update(payload: Row) {
    this.updatePayload = payload;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  delete() {
    this.doDelete = true;
    return this;
  }

  single() {
    return this.execute(true);
  }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    return this.execute().then(resolve, reject);
  }

  private async execute(single = false): Promise<QueryResult> {
    const user = getUserFromToken();
    let rows = readTable(this.storageKey);

    // Implicit per-user scoping for local table emulation
    if (this.storageKey === PROJECTS_KEY || this.storageKey === REFERENCE_TRACKS_KEY) {
      rows = rows.filter((r) => !user || r.user_id === user.id);
    }

    if (this.insertPayload) {
      const now = new Date().toISOString();
      const inserted = this.insertPayload.map((row) => ({
        id: row.id || crypto.randomUUID(),
        created_at: row.created_at || now,
        updated_at: row.updated_at || now,
        ...row,
      }));
      const existing = readTable(this.storageKey);
      writeTable(this.storageKey, [...existing, ...inserted]);
      return { data: single ? inserted[0] : inserted, error: null };
    }

    if (this.updatePayload) {
      const existing = readTable(this.storageKey);
      const updated: Row[] = [];
      const next = existing.map((row) => {
        const match = applyFilters([row], this.filters).length > 0;
        if (!match) return row;
        const value = { ...row, ...this.updatePayload, updated_at: new Date().toISOString() };
        updated.push(value);
        return value;
      });
      writeTable(this.storageKey, next);
      return { data: single ? updated[0] ?? null : updated, error: null };
    }

    if (this.doDelete) {
      const existing = readTable(this.storageKey);
      const kept: Row[] = [];
      const deleted: Row[] = [];
      existing.forEach((row) => {
        const match = applyFilters([row], this.filters).length > 0;
        if (match) deleted.push(row);
        else kept.push(row);
      });
      writeTable(this.storageKey, kept);
      return { data: single ? deleted[0] ?? null : deleted, error: null };
    }

    let filtered = applyFilters(rows, this.filters);
    if (this.orderBy) {
      const { key, ascending } = this.orderBy;
      filtered = [...filtered].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        return ascending ? (a[key] > b[key] ? 1 : -1) : (a[key] < b[key] ? 1 : -1);
      });
    }

    return { data: single ? filtered[0] ?? null : filtered, error: null };
  }
}

class StorageBucket {
  constructor(private readonly bucket: string) {}

  async upload(path: string, file: Blob, _opts?: { contentType?: string }) {
    const key = `studio_daw_storage:${this.bucket}:${path}`;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    localStorage.setItem(
      key,
      JSON.stringify({
        contentType: file.type,
        bytes,
      }),
    );
    return { data: { path }, error: null as { message: string } | null };
  }

  getPublicUrl(path: string) {
    const key = `studio_daw_storage:${this.bucket}:${path}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { data: { publicUrl: '' } };
    }
    const parsed = JSON.parse(raw) as { contentType?: string; bytes: number[] };
    const mime = parsed.contentType || 'application/octet-stream';
    const byteArray = new Uint8Array(parsed.bytes || []);
    let binary = '';
    byteArray.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    const base64 = btoa(binary);
    return {
      data: {
        publicUrl: `data:${mime};base64,${base64}`,
      },
    };
  }

  async remove(paths: string[]) {
    paths.forEach((path) => localStorage.removeItem(`studio_daw_storage:${this.bucket}:${path}`));
    return { data: null, error: null as { message: string } | null };
  }
}

async function invokeFunction(name: string, body?: unknown) {
  const token = getToken();
  const baseUrl = Env.get('VITE_MUSIC_ATLAS_API_URL');
  const response = await fetch(`${baseUrl}/api/studio/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: { message: data?.error || `Studio function failed (${response.status})` },
    };
  }

  return { data, error: null };
}

export const supabase = {
  auth: {
    async getUser() {
      return { data: { user: getUserFromToken() }, error: null };
    },
    async getSession() {
      const user = getUserFromToken();
      return { data: { session: user ? { user, access_token: getToken() } : null }, error: null };
    },
    onAuthStateChange(_cb: (event: string, session: any) => void) {
      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      };
    },
    async signOut() {
      localStorage.removeItem('token');
      return { error: null };
    },
    async signUp() {
      return { error: { message: 'Use Music Atlas registration flow.' } };
    },
    async signInWithPassword() {
      return { error: { message: 'Use Music Atlas login flow.' } };
    },
  },
  from(table: string) {
    return new QueryBuilder(table);
  },
  storage: {
    from(bucket: string) {
      return new StorageBucket(bucket);
    },
  },
  functions: {
    invoke(name: string, params?: { body?: unknown }) {
      return invokeFunction(name, params?.body);
    },
  },
};
