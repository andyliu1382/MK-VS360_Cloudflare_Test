import { destroySession } from '../../../worker-utils/auth.js';

export async function onRequestPost({ request, env }) {
  return destroySession(request, env);
}
