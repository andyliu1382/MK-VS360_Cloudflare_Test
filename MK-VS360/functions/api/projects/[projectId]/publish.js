import { randomId } from '../../../../worker-utils/crypto.js';
import { canAccessProject, nowIso } from '../../../../worker-utils/db.js';
import { putJson } from '../../../../worker-utils/r2.js';
import { json, error, readJson } from '../../../../worker-utils/response.js';

export async function onRequestPost({ request, env, data, params }) {
  if (!(await canAccessProject(env, data.user.id, params.projectId))) return error('Project not found.', 404);
  const body = await readJson(request);
  const shareId = randomId('tour_');
  const now = nowIso();
  const manifest = {
    projectId: params.projectId,
    title: body.title || 'Published Tour',
    scenes: stripInlineData(body.scenes || []),
    hotspots: stripInlineData(body.hotspots || []),
    createdAt: now
  };
  await putJson(env, `published/${shareId}/manifest.json`, manifest);
  await env.DB.prepare(
    'INSERT INTO published_tours (id, project_id, share_id, title, manifest_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(randomId('published_'), params.projectId, shareId, manifest.title, JSON.stringify(manifest), now, now).run();
  return json({ shareId, url: `/view/${shareId}` }, 201);
}

function stripInlineData(value) {
  if (Array.isArray(value)) return value.map(stripInlineData);
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && value.startsWith('data:')) return null;
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['base64', 'dataUrl'].includes(key))
      .map(([key, entry]) => [key, stripInlineData(entry)])
  );
}
