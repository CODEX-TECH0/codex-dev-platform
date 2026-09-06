import { Link, useParams, Navigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { DOC_SECTIONS } from './docsContent';
import { ENDPOINT_GROUPS, type EndpointDoc } from './endpointDocs';

// Combined, ordered index across guides + reference groups so prev/next
// navigation reads as one progressive path rather than two disconnected
// lists — guides first (concepts), then API reference (specifics).
const COMBINED = [
  ...DOC_SECTIONS.map((s) => ({ slug: s.slug, title: s.title })),
  ...ENDPOINT_GROUPS.map((g) => ({ slug: g.slug, title: g.title }))
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between bg-bg px-3 py-1.5">
        <span className="font-mono text-[11px] text-text-secondary">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary"
        >
          <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto bg-surface p-3 font-mono text-xs leading-relaxed text-text-primary">{code}</pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-accent-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-accent-primary">
          POST
        </span>
        <span className="font-mono text-sm text-text-primary">{endpoint.path}</span>
        <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">
          scope: {endpoint.scope}
        </span>
      </div>

      <p className="mb-4 text-sm text-text-secondary">{endpoint.purpose}</p>

      <div className="mb-4 grid grid-cols-1 gap-3 text-xs text-text-secondary md:grid-cols-2">
        <div>
          <p className="mb-1 font-medium text-text-primary">Authentication</p>
          <p>Authorization: Bearer cx_test_... or cx_live_...</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-text-primary">Request fields</p>
          <p>{endpoint.requestFields}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium text-text-primary">Request body</p>
          <CodeBlock label="request" code={endpoint.requestExample} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-text-primary">Response (200)</p>
          <CodeBlock label="response" code={endpoint.responseExample} />
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-text-primary">Errors</p>
        <ul className="list-inside list-disc space-y-0.5 text-xs text-text-secondary">
          {endpoint.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium text-text-primary">cURL</p>
          <CodeBlock label="curl" code={endpoint.curl} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-text-primary">JavaScript</p>
          <CodeBlock label="javascript" code={endpoint.javascript} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-text-primary">Python</p>
          <CodeBlock label="python" code={endpoint.python} />
        </div>
      </div>

      <div className="mb-1">
        <p className="mb-1 text-xs font-medium text-text-primary">Practical use</p>
        <p className="text-xs text-text-secondary">{endpoint.practicalUse}</p>
      </div>

      {endpoint.securityNotes && (
        <div className="mt-3 rounded-md border-l-2 border-warning bg-warning/5 px-3 py-2">
          <p className="text-xs font-medium text-warning">Security notes</p>
          <p className="mt-0.5 text-xs text-text-secondary">{endpoint.securityNotes}</p>
        </div>
      )}
    </div>
  );
}

export default function DocSectionPage() {
  const { slug } = useParams<{ slug: string }>();

  const guide = DOC_SECTIONS.find((s) => s.slug === slug);
  const group = ENDPOINT_GROUPS.find((g) => g.slug === slug);

  if (!guide && !group) return <Navigate to="/docs" replace />;

  const index = COMBINED.findIndex((s) => s.slug === slug);
  const prev = COMBINED[index - 1];
  const next = COMBINED[index + 1];

  return (
    <div className="p-6">
      <Link to="/docs" className="mb-4 inline-block text-sm text-accent-secondary hover:underline">
        ← All documentation
      </Link>

      {guide && (
        <>
          <h1 className="mb-4 text-2xl font-semibold text-text-primary">{guide.title}</h1>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm leading-relaxed text-text-secondary">{guide.body}</p>
          </div>
        </>
      )}

      {group && (
        <>
          <h1 className="mb-1 text-2xl font-semibold text-text-primary">{group.title}</h1>
          <p className="mb-6 text-sm text-text-secondary">{group.summary}</p>
          <div className="space-y-6">
            {group.endpoints.map((e) => (
              <EndpointCard key={e.path} endpoint={e} />
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex justify-between text-sm">
        {prev ? (
          <Link to={`/docs/${prev.slug}`} className="text-accent-secondary hover:underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/docs/${next.slug}`} className="text-accent-secondary hover:underline">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
