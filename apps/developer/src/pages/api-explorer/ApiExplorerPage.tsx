import { useState } from 'react';
import { Copy, Check, Plus, Trash2 } from 'lucide-react';
import { ToolShell } from '@/components/ToolShell';

// Every implemented /v1/* endpoint — kept in sync with docs/openapi.yaml.
const ENDPOINTS = [
  { path: '/v1/uuid/generate', sample: '{"count": 3}' },
  { path: '/v1/hash', sample: '{"input": "hello world", "algorithm": "SHA-256"}' },
  { path: '/v1/base64/encode', sample: '{"input": "hello world"}' },
  { path: '/v1/base64/decode', sample: '{"input": "aGVsbG8gd29ybGQ="}' },
  { path: '/v1/json/validate', sample: '{"input": "{\\"a\\":1}"}' },
  { path: '/v1/json/format', sample: '{"input": "{\\"a\\":1}", "indent": 2}' },
  { path: '/v1/json/minify', sample: '{"input": "{ \\"a\\": 1 }"}' },
  { path: '/v1/url/encode', sample: '{"input": "hello world/test"}' },
  { path: '/v1/url/decode', sample: '{"input": "hello%20world"}' },
  { path: '/v1/url/parse', sample: '{"input": "https://codex.dev/docs?x=1"}' },
  { path: '/v1/timestamp/convert', sample: '{"value": 1700000000, "from": "unix_seconds"}' },
  { path: '/v1/validate/email', sample: '{"input": "you@example.com"}' },
  { path: '/v1/validate/url', sample: '{"input": "https://example.com"}' },
  { path: '/v1/validate/uuid', sample: '{"input": "550e8400-e29b-41d4-a716-446655440000"}' },
  { path: '/v1/validate/ip', sample: '{"input": "192.168.1.1"}' },
  { path: '/v1/validate/json', sample: '{"input": "{\\"a\\":1}"}' },
  { path: '/v1/validate/phone', sample: '{"input": "+14155552671"}' },
  { path: '/v1/regex/test', sample: '{"pattern": "\\\\d+", "flags": "g", "input": "there are 42 items"}' },
  { path: '/v1/otp/send', sample: '{"recipient": "you@example.com"}' },
  { path: '/v1/otp/verify', sample: '{"verification_id": "", "code": ""}' }
];

interface HeaderRow {
  key: string;
  value: string;
}

export default function ApiExplorerPage() {
  const [endpointIdx, setEndpointIdx] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [body, setBody] = useState(ENDPOINTS[0].sample);
  const [extraHeaders, setExtraHeaders] = useState<HeaderRow[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [requestIdFromResponse, setRequestIdFromResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const endpoint = ENDPOINTS[endpointIdx];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const functionName = endpoint.path.replace(/^\/v1\//, '').replace(/\//g, '-');
  const fullUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    for (const h of extraHeaders) {
      if (h.key.trim()) headers[h.key.trim()] = h.value;
    }
    return headers;
  }

  function requestAsCurl(): string {
    const headers = buildHeaders();
    const headerFlags = Object.entries(headers)
      .map(([k, v]) => `  -H "${k}: ${k === 'Authorization' ? v.replace(/Bearer .+/, 'Bearer ***') : v}"`)
      .join(' \\\n');
    return `curl -X POST "${fullUrl}" \\\n${headerFlags} \\\n  -d '${body}'`;
  }

  async function send() {
    setSending(true);
    setResponse(null);
    setRequestIdFromResponse(null);
    const started = performance.now();
    try {
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: buildHeaders(),
        body
      });
      const json = await res.json();
      setStatus(res.status);
      setResponse(JSON.stringify(json, null, 2));
      setRequestIdFromResponse(json?.request_id ?? null);
    } catch (e) {
      setStatus(null);
      setResponse(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTimeMs(Math.round(performance.now() - started));
      setSending(false);
    }
  }

  function copyRequest() {
    navigator.clipboard.writeText(requestAsCurl());
    setCopiedRequest(true);
    setTimeout(() => setCopiedRequest(false), 1200);
  }

  function copyResponse() {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 1200);
  }

  function addHeaderRow() {
    setExtraHeaders((prev) => [...prev, { key: '', value: '' }]);
  }

  function updateHeaderRow(i: number, field: 'key' | 'value', value: string) {
    setExtraHeaders((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));
  }

  function removeHeaderRow(i: number) {
    setExtraHeaders((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <ToolShell title="API Explorer" description="Send real requests to every implemented Codex API endpoint using one of your API keys.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Endpoint</label>
            <select
              value={endpointIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setEndpointIdx(idx);
                setBody(ENDPOINTS[idx].sample);
              }}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            >
              {ENDPOINTS.map((e, i) => (
                <option key={e.path} value={i}>
                  POST {e.path}
                </option>
              ))}
            </select>
            <p className="mt-1 truncate font-mono text-xs text-text-secondary">{fullUrl}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-secondary">API Key (Authorization: Bearer …)</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="cx_test_…"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-text-secondary">Additional headers</label>
              <button onClick={addHeaderRow} className="flex items-center gap-1 text-xs text-accent-secondary hover:underline">
                <Plus size={12} /> Add header
              </button>
            </div>
            {extraHeaders.length === 0 ? (
              <p className="text-xs text-text-secondary">Content-Type and Authorization are set automatically.</p>
            ) : (
              <div className="space-y-2">
                {extraHeaders.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={h.key}
                      onChange={(e) => updateHeaderRow(i, 'key', e.target.value)}
                      placeholder="Header-Name"
                      className="w-1/2 rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary"
                    />
                    <input
                      value={h.value}
                      onChange={(e) => updateHeaderRow(i, 'value', e.target.value)}
                      placeholder="value"
                      className="w-1/2 rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary"
                    />
                    <button onClick={() => removeHeaderRow(i)} aria-label="Remove header" className="text-text-secondary hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-text-secondary">Request body (JSON)</label>
              <button onClick={copyRequest} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
                {copiedRequest ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                Copy as cURL
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              className="h-40 w-full resize-none rounded-md border border-border bg-bg p-3 font-mono text-sm text-text-primary outline-none focus:border-accent-primary"
            />
          </div>

          <button
            onClick={send}
            disabled={sending || !apiKey}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send request'}
          </button>
          {!apiKey && <p className="text-xs text-text-secondary">Paste an API key above to send a request.</p>}
        </div>

        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <span>Response</span>
            {status !== null && (
              <span className={status < 400 ? 'text-success' : 'text-danger'}>Status {status}</span>
            )}
            {timeMs !== null && <span>{timeMs}ms</span>}
            {requestIdFromResponse && <span className="font-mono">{requestIdFromResponse}</span>}
            {response && (
              <button onClick={copyResponse} className="ml-auto flex items-center gap-1 hover:text-text-primary">
                {copiedResponse ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                Copy
              </button>
            )}
          </div>
          <pre className="h-[420px] overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-text-primary">
            {response ?? '// response will appear here'}
          </pre>
        </div>
      </div>
    </ToolShell>
  );
}
