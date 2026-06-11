import { randomId } from '../../../worker-utils/crypto.js';
import { canAccessProject } from '../../../worker-utils/db.js';
import { assetKey } from '../../../worker-utils/r2.js';
import { assertUploadAllowed } from '../../../worker-utils/quota.js';
import { json, error, readJson } from '../../../worker-utils/response.js';

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  if (!(await canAccessProject(env, data.user.id, body.projectId))) return error('Project not found.', 404);
  assertUploadAllowed({ sizeBytes: body.sizeBytes });
  const assetId = randomId('asset_');
  const key = assetKey({ userId: data.user.id, projectId: body.projectId, assetId, filename: body.filename });
  return json({
    upload: {
      assetId,
      key,
      // Direct browser-to-R2 signing can be added later. Phase 1 skeleton uses complete as the metadata commit step.
      uploadUrl: null
    }
  });
}
