const SESSION_COOKIE = 'mkvs360_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        if (error instanceof HttpError) {
          return json({ error: error.message }, error.status);
        }
        console.error(error);
        return json({ error: 'Server error' }, 500);
      }
    }

    if (url.pathname === '/') {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/index_cloud_hq.html';
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    validatePassword(password);

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(normalizedEmail)
      .first();
    if (existing) return json({ error: '此 email 已經註冊。' }, 409);

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, provider, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, normalizedEmail, passwordHash, 'password', now).run();

    return createSessionResponse(env, { id: userId, email: normalizedEmail });
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const user = await env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .bind(normalizedEmail)
      .first();
    if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return json({ error: 'Email 或密碼不正確。' }, 401);
    }

    return createSessionResponse(env, user);
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const sessionId = getCookie(request, SESSION_COOKIE);
    if (sessionId) {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    }
    return json({ ok: true }, 200, clearSessionCookie());
  }

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await getCurrentUser(request, env);
    if (!user) return json({ error: 'Not authenticated' }, 401);
    return json({ user: publicUser(user) });
  }

  if (url.pathname === '/api/auth/google/start' && request.method === 'GET') {
    return startGoogleOAuth(request, env);
  }

  if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') {
    return finishGoogleOAuth(request, env, url);
  }

  return json({ error: 'Not found' }, 404);
}

function normalizeEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new HttpError('Email 格式不正確。', 400);
  }
  return value;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpError('密碼至少需要 8 個字元。', 400);
  }
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2_sha256$150000$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, storedHash) {
  const [algo, iterationText, saltText, hashText] = String(storedHash || '').split('$');
  if (algo !== 'pbkdf2_sha256') return false;
  const salt = unbase64url(saltText);
  const iterations = Number(iterationText);
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return timingSafeEqual(base64url(new Uint8Array(bits)), hashText);
}

async function createSessionResponse(env, user) {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, user.id, expires.toISOString(), now.toISOString()).run();

  return json({ user: publicUser(user) }, 200, sessionCookie(sessionId, expires));
}

async function getCurrentUser(request, env) {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    `SELECT users.id, users.email, users.provider, sessions.expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?`
  ).bind(sessionId).first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }
  return row;
}

function startGoogleOAuth(request, env) {
  if (!env.GOOGLE_CLIENT_ID) {
    return json({ error: 'Google OAuth 尚未設定 GOOGLE_CLIENT_ID。' }, 501);
  }
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': `mkvs360_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    }
  });
}

async function finishGoogleOAuth(request, env, url) {
  const expectedState = getCookie(request, 'mkvs360_oauth_state');
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!expectedState || expectedState !== state || !code) {
    return json({ error: 'Google 登入驗證失敗。' }, 400);
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: 'Google OAuth 尚未設定完整。' }, 501);
  }

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
  if (!tokenResponse.ok) return json({ error: 'Google token exchange failed' }, 401);

  const payload = parseJwt(tokenData.id_token);
  const email = normalizeEmail(payload.email);
  const googleSub = String(payload.sub || '');
  if (!googleSub) return json({ error: 'Google account response missing subject.' }, 401);

  let user = await env.DB.prepare('SELECT id, email FROM users WHERE google_sub = ? OR email = ?')
    .bind(googleSub, email)
    .first();

  if (!user) {
    user = { id: crypto.randomUUID(), email };
    await env.DB.prepare(
      'INSERT INTO users (id, email, google_sub, provider, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, email, googleSub, 'google', new Date().toISOString()).run();
  } else {
    await env.DB.prepare('UPDATE users SET google_sub = ?, provider = ? WHERE id = ?')
      .bind(googleSub, 'google', user.id)
      .run();
  }

  const response = await createSessionResponse(env, user);
  response.headers.append('Set-Cookie', 'mkvs360_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  response.headers.set('Location', '/');
  return new Response(null, { status: 302, headers: response.headers });
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: 'member', provider: user.provider || 'password' };
}

function json(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  for (const [key, value] of Object.entries(extraHeaders)) headers.append(key, value);
  return new Response(JSON.stringify(body), { status, headers });
}

function sessionCookie(sessionId, expires) {
  return {
    'Set-Cookie': `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}`
  };
}

function clearSessionCookie() {
  return {
    'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  };
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unbase64url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function parseJwt(token) {
  const [, payload] = String(token || '').split('.');
  if (!payload) throw new HttpError('Invalid Google token.', 401);
  return JSON.parse(new TextDecoder().decode(unbase64url(payload)));
}

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
