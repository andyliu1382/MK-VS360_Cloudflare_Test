import { hashPassword } from '../../../worker-utils/crypto.js';
import { createUser, findUserByEmail, normalizeEmail, nowIso } from '../../../worker-utils/db.js';
import { sessionResponse } from '../../../worker-utils/auth.js';
import { error, readJson } from '../../../worker-utils/response.js';

export async function onRequestPost({ request, env }) {
  const { email, password } = await readJson(request);
  const normalizedEmail = normalizeEmail(email);
  if (typeof password !== 'string' || password.length < 8) return error('Password must be at least 8 characters.', 400);

  const existing = await findUserByEmail(env, normalizedEmail);
  if (existing) return error('This email is already registered.', 409);

  const user = await createUser(env, { email: normalizedEmail });
  const now = nowIso();
  await env.DB.prepare(
    'INSERT INTO password_credentials (user_id, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).bind(user.id, await hashPassword(password), now, now).run();

  return sessionResponse(env, user, 201);
}
