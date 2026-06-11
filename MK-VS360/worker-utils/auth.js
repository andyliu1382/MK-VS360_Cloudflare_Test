import { SESSION_COOKIE, getCookie, sessionCookie, clearSessionCookie } from './cookies.js';
import { randomId } from './crypto.js';
import { json, error } from './response.js';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    avatarUrl: user.avatar_url || null
  };
}

export async function createSession(env, userId) {
  const sessionId = randomId('sess_');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, userId, expires.toISOString(), now.toISOString()).run();
  return { sessionId, expires };
}

export async function getSessionUser(request, env) {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  const row = await env.DB.prepare(
    `SELECT users.*
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ? AND sessions.expires_at > ? AND users.deleted_at IS NULL`
  ).bind(sessionId, new Date().toISOString()).first();
  return row || null;
}

export async function requireUser(context) {
  const user = context.data?.user || await getSessionUser(context.request, context.env);
  if (!user) return null;
  return user;
}

export async function sessionResponse(env, user, status = 200) {
  const { sessionId, expires } = await createSession(env, user.id);
  return json({ user: publicUser(user) }, status, { 'Set-Cookie': sessionCookie(sessionId, expires) });
}

export async function destroySession(request, env) {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

export async function authRequired(context) {
  const user = await requireUser(context);
  if (!user) return error('Authentication required.', 401);
  context.data.user = user;
  return null;
}
