import { verifyPassword } from '../../../worker-utils/crypto.js';
import { findUserByEmail, normalizeEmail } from '../../../worker-utils/db.js';
import { sessionResponse } from '../../../worker-utils/auth.js';
import { error, readJson } from '../../../worker-utils/response.js';

export async function onRequestPost({ request, env }) {
  const { email, password } = await readJson(request);
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(env, normalizedEmail);
  if (!user) return error('Email or password is incorrect.', 401);

  const credential = await env.DB.prepare('SELECT password_hash FROM password_credentials WHERE user_id = ?')
    .bind(user.id)
    .first();
  if (!credential || !(await verifyPassword(password, credential.password_hash))) {
    return error('Email or password is incorrect.', 401);
  }

  return sessionResponse(env, user);
}
