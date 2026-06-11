import { getSessionUser, publicUser } from '../../../worker-utils/auth.js';
import { json, error } from '../../../worker-utils/response.js';

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  if (!user) return error('Authentication required.', 401);
  return json({ user: publicUser(user) });
}
