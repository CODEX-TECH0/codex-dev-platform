import { useState, type ReactNode } from 'react';
import { Copy, Check, X } from 'lucide-react';

export function ToolShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">{title}</h1>
      <p className="mb-6 text-sm text-text-secondary">{description}</p>
      {children}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1 text-xs text-text-secondary hover:text-danger"
    >
      <X size={14} /> Clear
    </button>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  readOnly,
  error
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  error?: boolean;
}) {
  return (
    <textarea
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className={`h-64 w-full resize-none rounded-md border bg-bg p-3 font-mono text-sm text-text-primary outline-none ${
        error ? 'border-danger' : 'border-border focus:border-accent-primary'
      }`}
    />
  );
}
