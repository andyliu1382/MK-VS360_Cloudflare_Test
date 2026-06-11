import { canAccessProject, nowIso } from '../../../worker-utils/db.js';
import { json, error, readJson } from '../../../worker-utils/response.js';

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  if (!(await canAccessProject(env, data.user.id, body.projectId))) return error('Project not found.', 404);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO assets (id, project_id, owner_user_id, r2_key, filename, mime_type, size_bytes, width, height, purpose, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.assetId,
    body.projectId,
    data.user.id,
    body.key,
    body.filename || 'asset',
    body.mimeType || 'application/octet-stream',
    Number(body.sizeBytes || 0),
    body.width || null,
    body.height || null,
    body.purpose || 'panorama',
    now
  ).run();
  return json({ asset: { id: body.assetId, projectId: body.projectId, key: body.key } }, 201);
}
