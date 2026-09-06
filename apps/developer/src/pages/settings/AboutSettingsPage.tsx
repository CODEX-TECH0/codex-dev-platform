import { SettingsTabs } from '@/components/SettingsTabs';
import { PRODUCT_NAME, PRODUCT_VERSION, PRODUCT_STAGE, API_VERSION } from '@/version';

export default function AboutSettingsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Settings</h1>
      <SettingsTabs />

      <h2 className="mb-4 text-lg font-medium text-text-primary">About</h2>

      <div className="max-w-md space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Product</span>
          <span className="text-text-primary">{PRODUCT_NAME}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Version</span>
          <span className="text-text-primary">{PRODUCT_VERSION}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Stage</span>
          <span className="text-text-primary">{PRODUCT_STAGE}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">API version</span>
          <span className="font-mono text-text-primary">/{API_VERSION}/</span>
        </div>
      </div>

      <p className="mt-4 max-w-md text-xs text-text-secondary">
        Codex {PRODUCT_VERSION} is the product's first major version — Development, Beta, and Production are all
        still {PRODUCT_VERSION}. A future breaking change would introduce {API_VERSION === 'v1' ? 'v2' : 'a new API version'} alongside,
        not replacing, /{API_VERSION}/.
      </p>
    </div>
  );
}
