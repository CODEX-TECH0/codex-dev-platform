import { Link } from 'react-router-dom';
import { DOC_SECTIONS } from './docsContent';
import { ENDPOINT_GROUPS } from './endpointDocs';

export default function DocsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Documentation</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Reflects the currently implemented Codex V1 API — nothing planned, nothing deprecated left lingering.
      </p>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-secondary">Guides</h2>
      <div className="mb-10 space-y-3">
        {DOC_SECTIONS.map((s) => (
          <Link
            key={s.slug}
            to={`/docs/${s.slug}`}
            className="block rounded-lg border border-border bg-surface p-4 hover:border-accent-primary"
          >
            <h3 className="mb-1 font-medium text-text-primary">{s.title}</h3>
            <p className="line-clamp-2 text-sm text-text-secondary">{s.body}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-secondary">API Reference</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ENDPOINT_GROUPS.map((g) => (
          <Link
            key={g.slug}
            to={`/docs/${g.slug}`}
            className="block rounded-lg border border-border bg-surface p-4 hover:border-accent-primary"
          >
            <h3 className="mb-1 font-medium text-text-primary">{g.title}</h3>
            <p className="text-sm text-text-secondary">{g.summary}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {g.endpoints.length} endpoint{g.endpoints.length === 1 ? '' : 's'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
