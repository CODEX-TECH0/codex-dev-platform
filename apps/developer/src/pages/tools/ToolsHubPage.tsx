import { Link } from 'react-router-dom';
import {
  Braces,
  Binary,
  Fingerprint,
  Hash as HashIcon,
  Clock,
  Link2,
  Regex,
  FileDiff
} from 'lucide-react';

const TOOLS = [
  { to: '/tools/json', label: 'JSON Formatter / Validator / Minifier', icon: Braces },
  { to: '/tools/base64', label: 'Base64 Encoder / Decoder', icon: Binary },
  { to: '/tools/uuid', label: 'UUID Generator', icon: Fingerprint },
  { to: '/tools/hash', label: 'Hash Generator', icon: HashIcon },
  { to: '/tools/timestamp', label: 'Unix Timestamp Converter', icon: Clock },
  { to: '/tools/url', label: 'URL Encoder / Decoder', icon: Link2 },
  { to: '/tools/regex', label: 'Regex Tester', icon: Regex },
  { to: '/tools/diff', label: 'Text Diff', icon: FileDiff }
];

export default function ToolsHubPage() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Developer Tools</h1>
      <p className="mb-6 text-sm text-text-secondary">Fast, local utilities — nothing here leaves your browser.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-sm hover:border-accent-primary"
          >
            <Icon size={18} className="text-accent-primary" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
