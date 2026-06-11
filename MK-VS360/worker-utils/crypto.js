export function randomId(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}

export function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unbase64url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2_sha256$150000$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, iterationsText, saltText, hashText] = String(storedHash || '').split('$');
  if (algorithm !== 'pbkdf2_sha256') return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: unbase64url(saltText), iterations: Number(iterationsText), hash: 'SHA-256' },
    key,
    256
  );
  const actual = base64url(new Uint8Array(bits));
  if (actual.length !== hashText.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual.charCodeAt(i) ^ hashText.charCodeAt(i);
  return diff === 0;
}
