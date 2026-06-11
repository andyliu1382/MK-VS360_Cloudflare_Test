import { randomId } from './crypto.js';

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Email format is invalid.');
  return value;
}

export async function findUserByEmail(env, email) {
  return env.DB.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').bind(email).first();
}

export async function createUser(env, { email, name = null, avatarUrl = null }) {
  const now = nowIso();
  const user = {
    id: randomId('user_'),
    email,
    name,
    avatar_url: avatarUrl,
    created_at: now,
    updated_at: now
  };
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user.id, user.email, user.name, user.avatar_url, user.created_at, user.updated_at).run();
  return user;
}

export async function getOrCreateUser(env, { email, name = null, avatarUrl = null }) {
  const existing = await findUserByEmail(env, email);
  if (existing) return existing;
  return createUser(env, { email, name, avatarUrl });
}

export async function canAccessProject(env, userId, projectId) {
  const row = await env.DB.prepare(
    `SELECT projects.id
     FROM projects
     JOIN project_members ON project_members.project_id = projects.id
     WHERE projects.id = ? AND project_members.user_id = ? AND projects.deleted_at IS NULL`
  ).bind(projectId, userId).first();
  return Boolean(row);
}
