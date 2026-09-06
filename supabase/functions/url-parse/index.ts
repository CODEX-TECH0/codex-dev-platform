// supabase/functions/url-parse/index.ts
// POST /v1/url/parse — body: { input: string }
import { defineEndpoint } from '../_shared/handler.ts';

interface ParsedUrl {
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  params: Record<string, string>;
}

const handler = defineEndpoint<{ input: string }, ParsedUrl>(
  '/v1/url/parse',
  'url',
  (body) => {
    const b = body as { input?: unknown };
    if (typeof b.input !== 'string' || b.input.length === 0) return { error: 'input must be a non-empty string.' };
    return { value: { input: b.input } };
  },
  ({ input }) => {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new Error('input is not a valid absolute URL.');
    }
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (params[k] = v));
    return {
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      params
    };
  }
);

Deno.serve(handler);
