// Auto-structured API reference content — one entry per implemented endpoint,
// each following: Purpose, Auth, Request, Response, Errors, cURL + JS examples,
// Practical use, and (where relevant) Security notes. Kept in sync with the
// actual Edge Function implementations under supabase/functions/.

export interface EndpointDoc {
  path: string;
  scope: string;
  purpose: string;
  requestFields: string;
  requestExample: string;
  responseExample: string;
  errors: string[];
  curl: string;
  javascript: string;
  python: string;
  practicalUse: string;
  securityNotes?: string;
}

export interface EndpointGroup {
  slug: string;
  title: string;
  summary: string;
  kind: 'endpoints';
  endpoints: EndpointDoc[];
}

export const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    slug: 'uuid-api',
    title: 'UUID API',
    summary: `Generate cryptographically random UUID v4 values.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/uuid/generate',
        scope: 'uuid',
        purpose: `Generates one or more version-4 UUIDs using a cryptographically secure random source.`,
        requestFields: `count (optional, integer 1-100, default 1)`,
        requestExample: `{ "count": 3 }`,
        responseExample: `{ "success": true, "data": { "uuids": ["...", "...", "..."], "count": 3, "version": 4 }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — count outside 1-100 or not an integer`,
          `RATE_LIMITED — more than 120 requests/60s on this key`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/uuid-generate" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"count": 3}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/uuid-generate", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ count: 3 })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/uuid-generate",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"count": 3}
)
data = response.json()`,
        practicalUse: `Seeding primary keys, generating idempotency keys for client-side requests, or creating short-lived correlation IDs without a database round-trip.`,
      },
    ]
  },
  {
    slug: 'hash-api',
    title: 'Hash API',
    summary: `One-way hashing — not encryption.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/hash',
        scope: 'hash',
        purpose: `Computes a one-way cryptographic hash of an input string.`,
        requestFields: `input (required, string, max 100,000 chars), algorithm (optional, "SHA-256" | "SHA-384" | "SHA-512", default "SHA-256")`,
        requestExample: `{ "input": "hello world", "algorithm": "SHA-256" }`,
        responseExample: `{ "success": true, "data": { "algorithm": "SHA-256", "hash": "b94d27b9934d3e08...", "note": "Hashing is one-way and is not a form of encryption." }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input, input too long, or unsupported algorithm`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/hash" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello world", "algorithm": "SHA-256"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/hash", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "hello world", algorithm: "SHA-256" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/hash",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "hello world", "algorithm": "SHA-256"}
)
data = response.json()`,
        practicalUse: `Fingerprinting file contents, comparing values without storing the original (e.g. checking a webhook payload wasn't tampered with), or generating a stable cache key from a request body.`,
        securityNotes: `Hashing is irreversible by design. If you need to verify a value later (like a password or OTP code) without ever storing or transmitting the original, hash it client-side too and compare hashes — never send the raw secret back to compare.`,
      },
    ]
  },
  {
    slug: 'base64-api',
    title: 'Base64 API',
    summary: `UTF-8 safe Base64 encoding and decoding.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/base64/encode',
        scope: 'base64',
        purpose: `Base64-encodes a UTF-8 string.`,
        requestFields: `input (required, string, max 500,000 chars)`,
        requestExample: `{ "input": "hello world" }`,
        responseExample: `{ "success": true, "data": { "encoded": "aGVsbG8gd29ybGQ=" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input or over the length limit`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/base64-encode" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello world"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/base64-encode", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "hello world" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/base64-encode",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "hello world"}
)
data = response.json()`,
        practicalUse: `Embedding binary-ish text (like a small JSON payload) inside a URL query parameter or a header value that only accepts printable ASCII.`,
      },
      {
        path: '/v1/base64/decode',
        scope: 'base64',
        purpose: `Decodes a Base64 string back to UTF-8 text.`,
        requestFields: `input (required, string, max 700,000 chars)`,
        requestExample: `{ "input": "aGVsbG8gd29ybGQ=" }`,
        responseExample: `{ "success": true, "data": { "decoded": "hello world" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — input is not valid Base64, or doesn't decode to valid UTF-8`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/base64-decode" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "aGVsbG8gd29ybGQ="}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/base64-decode", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "aGVsbG8gd29ybGQ=" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/base64-decode",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "aGVsbG8gd29ybGQ="}
)
data = response.json()`,
        practicalUse: `Reading back a value your own system previously encoded, or decoding a Base64 payload received from a third-party webhook or API.`,
      },
    ]
  },
  {
    slug: 'json-api',
    title: 'JSON API',
    summary: `Validate, format, and minify JSON server-side.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/json/validate',
        scope: 'json',
        purpose: `Checks whether a string is valid JSON.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "{\\"a\\": 1}" }`,
        responseExample: `{ "success": true, "data": { "valid": true, "error": null }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — input is not a non-empty string`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/json-validate" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "{\\"a\\": 1}"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/json-validate", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: JSON.stringify({ a: 1 }) })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/json-validate",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "{\\"a\\": 1}"}
)
data = response.json()`,
        practicalUse: `Validating a payload a user pasted into a config field before you try to persist or act on it.`,
      },
      {
        path: '/v1/json/format',
        scope: 'json',
        purpose: `Pretty-prints a JSON string with configurable indentation.`,
        requestFields: `input (required, valid JSON string), indent (optional, integer 0-8, default 2)`,
        requestExample: `{ "input": "{\\"a\\":1}", "indent": 2 }`,
        responseExample: `{ "success": true, "data": { "formatted": "{\\n  \\"a\\": 1\\n}" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — input isn't parseable JSON, or indent is out of range`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/json-format" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "{\\"a\\":1}", "indent": 2}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/json-format", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: JSON.stringify({ a: 1 }), indent: 2 })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/json-format",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "{\\"a\\":1}", "indent": 2}
)
data = response.json()`,
        practicalUse: `Server-side pretty-printing for a "view raw config" panel without shipping a JSON formatter library to the client.`,
      },
      {
        path: '/v1/json/minify',
        scope: 'json',
        purpose: `Removes all non-essential whitespace from a JSON string.`,
        requestFields: `input (required, valid JSON string)`,
        requestExample: `{ "input": "{ \\"a\\": 1 }" }`,
        responseExample: `{ "success": true, "data": { "minified": "{\\"a\\":1}" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — input isn't parseable JSON`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/json-minify" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "{ \\"a\\": 1 }"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/json-minify", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "{ \\"a\\": 1 }" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/json-minify",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "{ \\"a\\": 1 }"}
)
data = response.json()`,
        practicalUse: `Shrinking a config payload before storing it, to save space or bandwidth.`,
      },
    ]
  },
  {
    slug: 'url-api',
    title: 'URL API',
    summary: `Encode, decode, and parse URLs.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/url/encode',
        scope: 'url',
        purpose: `Percent-encodes a string for safe use in a URL.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "hello world/test" }`,
        responseExample: `{ "success": true, "data": { "encoded": "hello%20world%2Ftest" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/url-encode" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello world/test"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/url-encode", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "hello world/test" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/url-encode",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "hello world/test"}
)
data = response.json()`,
        practicalUse: `Safely embedding a user-supplied string as a query parameter value.`,
      },
      {
        path: '/v1/url/decode',
        scope: 'url',
        purpose: `Percent-decodes a URL-encoded string.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "hello%20world" }`,
        responseExample: `{ "success": true, "data": { "decoded": "hello world" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — malformed percent-encoding`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/url-decode" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello%20world"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/url-decode", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "hello%20world" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/url-decode",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "hello%20world"}
)
data = response.json()`,
        practicalUse: `Reading a query parameter value back from a redirect URL a third party sent you.`,
      },
      {
        path: '/v1/url/parse',
        scope: 'url',
        purpose: `Parses an absolute URL into its components.`,
        requestFields: `input (required, absolute URL string)`,
        requestExample: `{ "input": "https://codex.dev/docs?x=1" }`,
        responseExample: `{ "success": true, "data": { "protocol": "https:", "host": "codex.dev", "hostname": "codex.dev", "port": "", "pathname": "/docs", "search": "?x=1", "hash": "", "params": { "x": "1" } }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — input is not a valid absolute URL`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/url-parse" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "https://codex.dev/docs?x=1"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/url-parse", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "https://codex.dev/docs?x=1" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/url-parse",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "https://codex.dev/docs?x=1"}
)
data = response.json()`,
        practicalUse: `Server-side validation and inspection of a webhook target URL before saving it.`,
      },
    ]
  },
  {
    slug: 'timestamp-api',
    title: 'Timestamp API',
    summary: `Convert between Unix time and ISO 8601.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/timestamp/convert',
        scope: 'timestamp',
        purpose: `Converts a timestamp between Unix seconds, Unix milliseconds, and ISO 8601 — returning all three.`,
        requestFields: `value (required, number or string), from (required, "unix_seconds" | "unix_ms" | "iso8601")`,
        requestExample: `{ "value": 1700000000, "from": "unix_seconds" }`,
        responseExample: `{ "success": true, "data": { "unix_seconds": 1700000000, "unix_ms": 1700000000000, "iso8601": "2023-11-14T22:13:20.000Z" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — from is not one of the three formats, or value can't be parsed as that format`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/timestamp-convert" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"value": 1700000000, "from": "unix_seconds"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/timestamp-convert", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ value: 1700000000, from: "unix_seconds" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/timestamp-convert",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"value": 1700000000, "from": "unix_seconds"}
)
data = response.json()`,
        practicalUse: `Normalizing timestamps from different upstream sources (some send seconds, some milliseconds, some ISO strings) into one consistent format before storing them.`,
      },
    ]
  },
  {
    slug: 'validation-api',
    title: 'Validation API',
    summary: `Format/structure validation — never claims deliverability or reachability.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/validate/email',
        scope: 'validate',
        purpose: `Checks whether a string is a structurally valid email address.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "you@example.com" }`,
        responseExample: `{ "success": true, "data": { "valid": true, "note": "Validates format only — does not verify the mailbox exists or accepts mail." }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/validate-email" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "you@example.com"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/validate-email", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "you@example.com" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/validate-email",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "you@example.com"}
)
data = response.json()`,
        practicalUse: `Client-side-equivalent format checking, done server-side so the rule can't be bypassed by editing frontend JS.`,
        securityNotes: `This checks shape only. It will happily return valid: true for an address that has never existed. Pair with /v1/otp/send if you need to confirm the address is actually reachable.`,
      },
      {
        path: '/v1/validate/url',
        scope: 'validate',
        purpose: `Checks whether a string is a structurally valid absolute URL.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "https://example.com" }`,
        responseExample: `{ "success": true, "data": { "valid": true }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/validate-url" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "https://example.com"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/validate-url", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "https://example.com" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/validate-url",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "https://example.com"}
)
data = response.json()`,
        practicalUse: `Validating a redirect or webhook URL a user is about to save.`,
      },
      {
        path: '/v1/validate/uuid',
        scope: 'validate',
        purpose: `Checks whether a string is a structurally valid UUID and, if so, reports its version.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "550e8400-e29b-41d4-a716-446655440000" }`,
        responseExample: `{ "success": true, "data": { "valid": true, "version": 4 }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/validate-uuid" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "550e8400-e29b-41d4-a716-446655440000"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/validate-uuid", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "550e8400-e29b-41d4-a716-446655440000" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/validate-uuid",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "550e8400-e29b-41d4-a716-446655440000"}
)
data = response.json()`,
        practicalUse: `Rejecting a malformed resource ID from a client before it ever reaches your database query.`,
      },
      {
        path: '/v1/validate/ip',
        scope: 'validate',
        purpose: `Checks whether a string is a structurally valid IPv4 or IPv6 address.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "192.168.1.1" }`,
        responseExample: `{ "success": true, "data": { "valid": true, "version": 4 }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/validate-ip" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "192.168.1.1"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/validate-ip", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "192.168.1.1" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/validate-ip",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "192.168.1.1"}
)
data = response.json()`,
        practicalUse: `Validating an IP allowlist/denylist entry an admin is adding through a settings UI.`,
      },
      {
        path: '/v1/validate/json',
        scope: 'validate',
        purpose: `Checks whether a string is valid JSON. Functionally identical to /v1/json/validate — provided under /v1/validate/ too since it's a validation-shaped question as much as a JSON-shaped one.`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "{\\"a\\":1}" }`,
        responseExample: `{ "success": true, "data": { "valid": true, "error": null }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/validate-json" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "{\\"a\\":1}"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/validate-json", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: JSON.stringify({ a: 1 }) })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/validate-json",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "{\\"a\\":1}"}
)
data = response.json()`,
        practicalUse: `Same as /v1/json/validate — use whichever reads more naturally in your integration.`,
      },
      {
        path: '/v1/validate/phone',
        scope: 'validate',
        purpose: `Checks whether a string is a structurally valid E.164 phone number (e.g. +14155552671).`,
        requestFields: `input (required, non-empty string)`,
        requestExample: `{ "input": "+14155552671" }`,
        responseExample: `{ "success": true, "data": { "valid": true, "note": "Validates E.164 format (e.g. +14155552671) only — does not verify the number is reachable." }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — empty input`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/validate-phone" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "+14155552671"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/validate-phone", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ input: "+14155552671" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/validate-phone",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"input": "+14155552671"}
)
data = response.json()`,
        practicalUse: `Rejecting an obviously malformed phone number in a signup form before it's stored.`,
        securityNotes: `E.164 format only — no carrier lookup, no reachability check. SMS OTP (schema-ready, not yet implemented) would be the eventual way to confirm a number is real.`,
      },
    ]
  },
  {
    slug: 'regex-api',
    title: 'Regex API',
    summary: `Test a regular expression against input text.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/regex/test',
        scope: 'regex',
        purpose: `Tests a regular expression against a string and returns every match.`,
        requestFields: `pattern (required, string, max 500 chars), flags (optional, any of gimsuy), input (required, string, max 20,000 chars)`,
        requestExample: `{ "pattern": "\d+", "flags": "g", "input": "there are 42 items" }`,
        responseExample: `{ "success": true, "data": { "matched": true, "matches": ["42"] }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — pattern is not a valid regular expression, or exceeds the length caps`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/regex-test" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"pattern": "\d+", "flags": "g", "input": "there are 42 items"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/regex-test", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ pattern: "\d+", flags: "g", input: "there are 42 items" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/regex-test",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={ "pattern": "\\d+", "flags": "g", "input": "there are 42 items" }
)
data = response.json()`,
        practicalUse: `Server-side extraction of structured fragments (order numbers, tracking codes) from free-text input.`,
        securityNotes: `Pattern and input are both length-capped specifically to bound worst-case regex execution time — this is not a general-purpose regex sandbox for arbitrary catastrophic-backtracking patterns.`,
      },
    ]
  },
  {
    slug: 'otp-api',
    title: 'OTP API',
    summary: `General-purpose one-time-code verification, not just for Codex's own login.`,
    kind: 'endpoints',
    endpoints: [
      {
        path: '/v1/otp/send',
        scope: 'otp',
        purpose: `Generates a 6-digit code, hashes and stores it, and emails it to the recipient (live keys) or returns it directly (test keys).`,
        requestFields: `recipient (required, email address), channel (optional, only "email" is supported in V1, default "email")`,
        requestExample: `{ "recipient": "you@example.com" }`,
        responseExample: `{ "success": true, "data": { "verification_id": "3fa85f64-...", "expires_at": "2026-09-04T12:05:00.000Z", "channel": "email", "test_code": "482913" }, "request_id": "req_..." }`,
        errors: [
          `INVALID_INPUT — recipient is not a valid email, or channel isn't "email"`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/otp-send" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"recipient": "you@example.com"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/otp-send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ recipient: "you@example.com" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/otp-send",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"recipient": "you@example.com"}
)
data = response.json()`,
        practicalUse: `Verifying a user actually controls the email address they signed up with, or gating a sensitive in-app action behind a fresh code.`,
        securityNotes: `test_code is ONLY present in responses from test-mode keys (cx_test_...) — never from live keys, and never logged anywhere. Codes expire in 5 minutes and lock out permanently after 5 wrong attempts.`,
      },
      {
        path: '/v1/otp/verify',
        scope: 'otp',
        purpose: `Checks a submitted code against a previously created verification.`,
        requestFields: `verification_id (required, from /v1/otp/send), code (required, 4-8 digit numeric string)`,
        requestExample: `{ "verification_id": "3fa85f64-...", "code": "482913" }`,
        responseExample: `{ "success": true, "data": { "verified": true, "verification_id": "3fa85f64-..." }, "request_id": "req_..." }`,
        errors: [
          `NOT_FOUND — verification_id doesn't exist for this project`,
          `INVALID_INPUT — already verified, expired, max attempts exceeded, or the code is simply wrong`
        ],
        curl: `curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/otp-verify" \\
  -H "Authorization: Bearer cx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"verification_id": "3fa85f64-...", "code": "482913"}'`,
        javascript: `const res = await fetch("https://<project-ref>.functions.supabase.co/functions/v1/otp-verify", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cx_test_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ verification_id: "3fa85f64-...", code: "482913" })
});
const data = await res.json();`,
        python: `import requests

response = requests.post(
    "https://<project-ref>.functions.supabase.co/functions/v1/otp-verify",
    headers={"Authorization": "Bearer cx_test_...", "Content-Type": "application/json"},
    json={"verification_id": "3fa85f64-...", "code": "482913"}
)
data = response.json()`,
        practicalUse: `Completing the verification step after /v1/otp/send — call this when the user submits the code they received.`,
        securityNotes: `Every failed attempt increments a counter; the 6th wrong attempt permanently fails that verification (a fresh /v1/otp/send is required), regardless of whether attempt #6 happens to be correct.`,
      },
    ]
  },
];
