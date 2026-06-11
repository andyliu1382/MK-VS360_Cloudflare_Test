import { json, error } from '../../../worker-utils/response.js';

export async function onRequestGet({ env, params }) {
  const tour = await env.DB.prepare(
    'SELECT * FROM published_tours WHERE share_id = ? AND deleted_at IS NULL'
  ).bind(params.shareId).first();
  if (!tour) return error('Tour not found.', 404);
  return json({
    tour: {
      shareId: tour.share_id,
      projectId: tour.project_id,
      title: tour.title,
      manifest: JSON.parse(tour.manifest_json || '{}'),
      updatedAt: tour.updated_at
    }
  });
}
