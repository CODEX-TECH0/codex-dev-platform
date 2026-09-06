export interface DocSection {
  slug: string;
  title: string;
  body: string;
}

// Guide-style prose docs. Per-endpoint API reference content lives in
// endpointDocs.ts (ENDPOINT_GROUPS) — richer, structured, and rendered
// separately by DocSectionPage so each endpoint gets Purpose/Request/
// Response/Errors/cURL+JS examples/Practical use rather than one line.
export const DOC_SECTIONS: DocSection[] = [
  {
    slug: 'what-is-codex',
    title: 'What is Codex?',
    body: "Codex is a developer platform: a set of utility and OTP APIs (JSON, UUID, hashing, Base64, URL, timestamps, validation, regex, one-time codes), plus the project/key/webhook management and analytics you'd otherwise have to build yourself around them. Everything runs on Supabase — there's no separate backend to operate. Codex is in free public beta; no payment method is required."
  },
  {
    slug: 'getting-started',
    title: 'Getting Started',
    body: "1) Create an account and verify your email. 2) Create a project — projects are how usage, keys, and webhooks are scoped and billed (eventually) separately. 3) Generate a test API key from API Keys (cx_test_...). 4) Send your first request from the API Explorer, or with the cURL/JavaScript examples on any endpoint's doc page. 5) Check Request Logs and Analytics to see it show up — both are empty until you make a real call; nothing on those pages is fabricated."
  },
  {
    slug: 'projects-and-keys',
    title: 'Projects, Test Keys, and Live Keys',
    body: "Every API key belongs to exactly one project. A project can hold multiple keys — for example, one per environment or per service that calls Codex. Test keys (cx_test_...) behave identically to live keys for every endpoint except OTP: sending an OTP from a test key returns the code directly in the response (test_code) so you can build and test the full flow without needing real email delivery. Live keys (cx_live_...) never return the code — it only ever goes to the recipient's inbox via Resend. Use test keys in development and staging; switch to a live key only when you're ready for real end users to receive real codes."
  },
  {
    slug: 'authentication',
    title: 'Authentication Headers',
    body: "Every protected /v1/* request needs one header: Authorization: Bearer cx_test_... (or cx_live_...). There is no separate API-key header, no query-string auth, and no session cookie involved — the bearer token is the entire authentication story for the public API. Requests without it, or with a key that's invalid, revoked, or expired, get a 401 with error code MISSING_API_KEY, INVALID_API_KEY, KEY_REVOKED, or KEY_EXPIRED."
  },
  {
    slug: 'first-request',
    title: 'Making Your First Request',
    body: "The simplest possible call is POST /v1/uuid/generate with an empty or {} body. In the terminal: curl -X POST \"https://<project-ref>.functions.supabase.co/functions/v1/uuid-generate\" -H \"Authorization: Bearer cx_test_...\" -H \"Content-Type: application/json\" -d '{}'. You should get back { \"success\": true, \"data\": { \"uuids\": [\"...\"], ... }, \"request_id\": \"req_...\" }. If you'd rather not leave the browser, the API Explorer does exactly this with a form."
  },
  {
    slug: 'handling-responses',
    title: 'Handling Responses',
    body: 'Every endpoint returns the same envelope shape on success: { "success": true, "data": { ... }, "request_id": "req_..." }. The request_id is worth logging on your side — it\'s the same ID that shows up in your Request Logs page, so it\'s the fastest way to correlate "what my server sent" with "what Codex actually did with it" when debugging.'
  },
  {
    slug: 'errors',
    title: 'How Errors Work',
    body: 'Failures use a parallel shape: { "success": false, "error": { "code": "...", "message": "..." }, "request_id": "req_..." }. error.code is a stable string you can branch on programmatically (INVALID_API_KEY, RATE_LIMITED, PROJECT_INACTIVE, PERMISSION_DENIED, INVALID_INPUT, NOT_FOUND, REQUEST_TOO_LARGE, INTERNAL_ERROR); error.message is human-readable and may change wording over time — don\'t match on it. HTTP status codes follow the error type (401 for auth problems, 400 for bad input, 403 for scope/permission issues, 404, 413, 429, 500).'
  },
  {
    slug: 'rate-limits',
    title: 'Rate Limits',
    body: "Each API key is limited to 120 requests per rolling 60-second window, checked per-key (not per-project or per-IP). Exceeding it returns HTTP 429 with error code RATE_LIMITED. There's no burst allowance beyond that window and no way to request a higher limit in V1 — if your workload needs more throughput, split traffic across multiple keys per project as an interim measure."
  },
  {
    slug: 'scopes',
    title: 'API Key Scopes and Permissions',
    body: 'Each API key has a scopes array, default ["*"] (unrestricted). You can instead scope a key to only the endpoint families it needs: "uuid", "hash", "base64", "json", "url", "timestamp", "validate", "regex", "otp". This is enforced server-side on every request — a key scoped to ["otp"] gets a real 403 PERMISSION_DENIED calling /v1/uuid/generate, not just a hidden button in the dashboard. Set scopes at creation time in API Keys; there\'s currently no way to edit scopes on an existing key — rotate or create a new key with the scopes you want instead.'
  },
  {
    slug: 'rotate-revoke',
    title: 'Rotating and Revoking Keys',
    body: "Revoke immediately invalidates a key — any request using it afterward gets 401 KEY_REVOKED. Rotate generates a brand-new secret for the same key (same name, project, environment, and scopes) and immediately invalidates the old secret, so anything still using the pre-rotation secret starts failing right away too. Both actions are available from the API Keys page and are audit-logged. There's no way to un-revoke a key — create a new one instead."
  },
  {
    slug: 'otp-guide',
    title: 'Using OTP End-to-End',
    body: 'Call POST /v1/otp/send with { "recipient": "user@example.com" } — you get back a verification_id. Ask your user for the code they received (or, on a test key, the test_code field in that same response) and call POST /v1/otp/verify with { "verification_id": "...", "code": "..." }. A successful verify returns { "verified": true }. Codes expire after 5 minutes and permanently lock out after 5 wrong attempts, even if a later attempt happens to guess correctly — send a fresh one instead of retrying indefinitely. See the OTP API reference page for full request/response detail and code samples.'
  },
  {
    slug: 'webhooks',
    title: 'Webhooks',
    body: 'Webhooks are managed from the dashboard (Webhooks page) using your Supabase Auth session, not an API key — they\'re not a public /v1 endpoint. Pick a project, a target URL, and which events to receive (otp.verified, otp.failed, api_key.created, api_key.revoked, project.updated), and Codex will POST a signed JSON payload to that URL whenever one fires. Use the "Test" button to send a real signed payload on demand before wiring up real traffic.'
  },
  {
    slug: 'verifying-webhook-signatures',
    title: 'Verifying Webhook Signatures',
    body: 'Every delivery includes X-Codex-Signature (HMAC-SHA256 of the raw JSON body, hex-encoded, using the signing secret shown once when you created the webhook), X-Codex-Event-Id, and X-Codex-Timestamp. To verify: compute HMAC-SHA256 of the exact request body bytes using your stored signing secret, hex-encode it, and compare to X-Codex-Signature using a constant-time comparison. In Node: const crypto = require("crypto"); const expected = crypto.createHmac("sha256", signingSecret).update(rawBody).digest("hex"); if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSignature))) { /* reject */ }. Always read the raw body for this — a re-serialized JSON.stringify(JSON.parse(body)) can byte-for-byte differ from what was signed.'
  },
  {
    slug: 'request-logs',
    title: 'Inspecting Request Logs',
    body: "Request Logs shows the most recent 100 calls across your projects: timestamp, endpoint, method, status code, environment, duration, and request ID. It's metadata only — request bodies, API secrets, and OTP codes are never logged, by construction, not just by policy. Use the request_id from a response to find the exact matching row here."
  },
  {
    slug: 'usage-analytics',
    title: 'Understanding Usage Analytics',
    body: "Dashboard and Analytics read directly from your real request history — total/successful/failed requests, error rate, a 14-day trend, top endpoints, and test-vs-live split. Everything is empty until you make a request; there is no seeded or fabricated data anywhere in these charts."
  },
  {
    slug: 'security',
    title: 'Security Practices',
    body: 'API key secrets and OTP codes are hashed (SHA-256) and never stored in plaintext — the full secret is shown exactly once, at creation. Webhook signing secrets are encrypted (not hashed), because Codex has to reuse the raw secret to sign every outgoing delivery. Practically: treat a live key like a password (never commit it, never log it, rotate it if you suspect exposure); prefer scoped keys over "*" wherever practical; and verify webhook signatures rather than trusting payload contents on their own.'
  }
];
