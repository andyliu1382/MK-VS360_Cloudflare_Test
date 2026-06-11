import { temporaryCookie, getCookie, clearCookie } from './cookies.js';
import { getOrCreateUser, nowIso, normalizeEmail } from './db.js';
import { randomId, unbase64url } from './crypto.js';

export const GOOGLE_STATE_COOKIE = 'mkvs360_google_state';

export function googleStartResponse(request, env) {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response(JSON.stringify({ error: 'GOOGLE_CLIENT_ID is not configured.' }), { status: 501 });
  }
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = randomId('state_');
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': temporaryCookie(GOOGLE_STATE_COOKIE, state)
    }
  });
}

export async function finishGoogleLogin(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const expectedState = getCookie(request, GOOGLE_STATE_COOKIE);
  if (!code || !state || state !== expectedState) throw new Error('Google OAuth state validation failed.');
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error('Google OAuth is not configured.');

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error('Google token exchange failed.');

  const payload = parseJwt(tokenData.id_token);
  const email = normalizeEmail(payload.email);
  const providerAccountId = String(payload.sub || '');
  if (!providerAccountId) throw new Error('Google account id is missing.');

  const user = await getOrCreateUser(env, {
    email,
    name: payload.name || null,
    avatarUrl: payload.picture || null
  });
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, provider_account_id)
     DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at`
  ).bind(randomId('oauth_'), user.id, 'google', providerAccountId, email, now, now).run();

  return { user, clearCookieHeader: clearCookie(GOOGLE_STATE_COOKIE) };
}

function parseJwt(token) {
  const [, payload] = String(token || '').split('.');
  if (!payload) throw new Error('Invalid Google id token.');
  return JSON.parse(new TextDecoder().decode(unbase64url(payload)));
}
