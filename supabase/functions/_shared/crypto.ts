// _shared/crypto.ts
// Uses Deno's built-in Web Crypto API — no external dependency needed.

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically secure API key secret.
 * Format: cx_{env}_{32 random hex chars}
 * Returns both the full secret (shown once) and the short prefix (safe to store/display).
 */
export function generateApiKeySecret(environment: 'test' | 'live'): {
  fullSecret: string;
  prefix: string;
} {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const randomHex = [...randomBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const fullSecret = `cx_${environment}_${randomHex}`;
  const prefix = fullSecret.slice(0, 14); // e.g. cx_live_8f2a91
  return { fullSecret, prefix };
}

/** Generates a short numeric OTP code (default 6 digits). */
export function generateOtpCode(length = 6): string {
  const digits = new Uint8Array(length);
  crypto.getRandomValues(digits);
  return [...digits].map((d) => (d % 10).toString()).join('');
}

/**
 * Generates a cryptographically secure webhook signing secret.
 * Format: whsec_{40 random hex chars}
 */
export function generateWebhookSecret(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));
  const randomHex = [...randomBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `whsec_${randomHex}`;
}

/** HMAC-SHA256 signs a payload string with a secret, returning hex digest. */
export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Reversible encryption for webhook signing secrets.
//
// Unlike API keys and OTP codes — which only ever need to be *verified*
// (so a one-way hash is correct and preferable) — a webhook signing secret
// must be used by Codex to sign every outgoing delivery. That means Codex
// itself needs the raw secret at send-time, not just a hash of it. So this
// is deliberately reversible (AES-GCM) using ENCRYPTION_KEY, not a hash.
// Never reuse this function for anything that only needs comparison.
// ---------------------------------------------------------------------------

async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('ENCRYPTION_KEY');
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not configured. Set it with: supabase secrets set ENCRYPTION_KEY=<32+ random bytes, base64>');
  }
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Encrypts a secret for storage. Returns base64(iv):base64(ciphertext). */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

/** Decrypts a value previously produced by encryptSecret. */
export async function decryptSecret(stored: string): Promise<string> {
  const [ivB64, ctB64] = stored.split(':');
  if (!ivB64 || !ctB64) throw new Error('Malformed encrypted secret.');
  const key = await getEncryptionKey();
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintextBuf);
}
