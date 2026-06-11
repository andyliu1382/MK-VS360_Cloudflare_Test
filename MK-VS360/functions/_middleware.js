import { getSessionUser } from '../worker-utils/auth.js';
import { error } from '../worker-utils/response.js';

export async function onRequest(context) {
  context.data = context.data || {};
  const pathname = new URL(context.request.url).pathname;
  const needsAuth = pathname.startsWith('/api/projects') || pathname.startsWith('/api/uploads');

  if (pathname.startsWith('/api/')) {
    const user = await getSessionUser(context.request, context.env);
    if (user) context.data.user = user;
    if (needsAuth && !user) return error('Authentication required.', 401);
  }

  return context.next();
}
