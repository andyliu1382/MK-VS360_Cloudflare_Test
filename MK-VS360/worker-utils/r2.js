export function assetKey({ userId, projectId, assetId, filename }) {
  const safeName = String(filename || 'asset.bin').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 100);
  return `users/${userId}/projects/${projectId}/assets/${assetId}/${safeName}`;
}

export async function putJson(env, key, value) {
  await env.R2.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
}
