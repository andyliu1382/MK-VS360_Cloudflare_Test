import { canAccessProject, nowIso } from '../../../worker-utils/db.js';
import { json, error, readJson } from '../../../worker-utils/response.js';

export async function onRequestGet({ env, data, params }) {
  if (!(await canAccessProject(env, data.user.id, params.projectId))) return error('Project not found.', 404);
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL')
    .bind(params.projectId)
    .first();
  return json({ project });
}

export async function onRequestPatch({ request, env, data, params }) {
  if (!(await canAccessProject(env, data.user.id, params.projectId))) return error('Project not found.', 404);
  const body = await readJson(request);
  const name = String(body.name || '').trim().slice(0, 120);
  if (!name) return error('Project name is required.', 400);
  const now = nowIso();
  await env.DB.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?')
    .bind(name, now, params.projectId)
    .run();
  return json({ project: { id: params.projectId, name, updated_at: now } });
}

export async function onRequestDelete({ env, data, params }) {
  if (!(await canAccessProject(env, data.user.id, params.projectId))) return error('Project not found.', 404);
  const now = nowIso();
  await env.DB.prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, params.projectId)
    .run();
  return json({ ok: true });
}
