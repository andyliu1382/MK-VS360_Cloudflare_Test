import { googleStartResponse } from '../../../../worker-utils/googleOAuth.js';

export async function onRequestGet({ request, env }) {
  return googleStartResponse(request, env);
}
