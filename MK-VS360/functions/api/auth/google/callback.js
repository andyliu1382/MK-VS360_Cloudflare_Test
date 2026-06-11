import { finishGoogleLogin } from '../../../../worker-utils/googleOAuth.js';
import { createSession, publicUser } from '../../../../worker-utils/auth.js';
import { sessionCookie } from '../../../../worker-utils/cookies.js';
import { error } from '../../../../worker-utils/response.js';

export async function onRequestGet({ request, env }) {
  try {
    const { user, clearCookieHeader } = await finishGoogleLogin(request, env);
    const { sessionId, expires } = await createSession(env, user.id);
    const headers = new Headers({
      Location: '/projects',
      'Set-Cookie': sessionCookie(sessionId, expires)
    });
    headers.append('Set-Cookie', clearCookieHeader);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    return error(err.message, 400);
  }
}
