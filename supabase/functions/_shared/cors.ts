// _shared/cors.ts
// Codex API is consumed by external developer applications (server-to-server
// and, in some cases, browser-based integrations), so unlike an internal-only
// endpoint we do allow cross-origin requests here — access control is
// enforced by the API key check, not by CORS. We still whitelist headers and
// methods explicitly rather than blindly allowing everything.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
