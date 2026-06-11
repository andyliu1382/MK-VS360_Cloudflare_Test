import { randomId } from '../../../worker-utils/crypto.js';
import { nowIso } from '../../../worker-utils/db.js';
import { json, readJson } from '../../../worker-utils/response.js';

export async function onRequestGet({ env, data }) {
  const result = await env.DB.prepare(
    `SELECT projects.*, COUNT(scenes.id) AS scene_count
     FROM projects
     JOIN project_members ON project_members.project_id = projects.id
     LEFT JOIN scenes ON scenes.project_id = projects.id AND scenes.deleted_at IS NULL
     WHERE project_members.user_id = ? AND projects.deleted_at IS NULL
     GROUP BY projects.id
     ORDER BY projects.updated_at DESC`
  ).bind(data.user.id).all();
  return json({ projects: result.results || [] });
}

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  const now = nowIso();
  const projectId = randomId('project_');
  const name = String(body.name || 'Untitled Project').trim().slice(0, 120) || 'Untitled Project';

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO projects (id, owner_user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(projectId, data.user.id, name, body.description || null, now, now),
    env.DB.prepare(
      'INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?, ?, ?, ?)'
    ).bind(projectId, data.user.id, 'owner', now)
  ]);

  return json({ project: { id: projectId, name, description: body.description || null, created_at: now, updated_at: now } }, 201);
}
