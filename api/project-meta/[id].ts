// ── GET / PUT / DELETE /api/project-meta/:id ─────────────────────────────
// Per-project library metadata (tags + collaborator roster) keyed by project
// id. GET is readable by any authed user; PUT/DELETE are restricted to the
// project's owner (the first writer, stamped on first PUT).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getProjectMeta,
  setProjectMeta,
  deleteProjectMeta,
  type StoredProjectMeta,
} from './_utils.js';

// Kept in sync with PROJECT_STATUSES on the frontend (src/daw/data/projectMeta).
const PROJECT_STATUSES = ['Idea', 'In progress', 'Mixing', 'Done', 'Archived'];

interface ProjectMetaInput {
  genre: string;
  status: string;
  instruments: string[];
  collaborators: string[];
}

// A partial/corrupt blob would break the Library card, so validate the shape.
function isValidMetaInput(value: unknown): value is ProjectMetaInput {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  const isStringArray = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((s) => typeof s === 'string');
  return (
    typeof m.genre === 'string' &&
    typeof m.status === 'string' &&
    (m.status === '' || PROJECT_STATUSES.includes(m.status)) &&
    isStringArray(m.instruments) &&
    isStringArray(m.collaborators)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const auth = await verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const projectId = req.query.id as string;
  if (!projectId) {
    res.status(400).json({ error: 'Missing project id' });
    return;
  }

  const redis = getRedis();

  if (req.method === 'GET') {
    const meta = await getProjectMeta(redis, projectId);
    res.status(200).json({ meta: meta ?? null });
    return;
  }

  if (req.method === 'PUT') {
    if (!isValidMetaInput(req.body)) {
      res.status(400).json({ error: 'Invalid project meta' });
      return;
    }
    const existing = await getProjectMeta(redis, projectId);
    if (existing && existing.ownerId !== auth.sub) {
      res.status(403).json({ error: 'Not the project owner' });
      return;
    }
    const meta: StoredProjectMeta = {
      ownerId: existing?.ownerId ?? auth.sub,
      genre: req.body.genre,
      status: req.body.status,
      instruments: req.body.instruments,
      collaborators: req.body.collaborators,
      updatedAt: Date.now(),
    };
    await setProjectMeta(redis, projectId, meta);
    res.status(200).json({ meta });
    return;
  }

  if (req.method === 'DELETE') {
    const existing = await getProjectMeta(redis, projectId);
    if (existing && existing.ownerId !== auth.sub) {
      res.status(403).json({ error: 'Not the project owner' });
      return;
    }
    await deleteProjectMeta(redis, projectId);
    res.status(200).json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
