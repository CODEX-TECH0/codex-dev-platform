import { Sun, Moon, Monitor } from 'lucide-react';
import { SettingsTabs } from '@/components/SettingsTabs';
import { useTheme, type ThemePreference } from '@/features/theme/ThemeContext';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
];

export default function AppearanceSettingsPage() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Settings</h1>
      <SettingsTabs />

      <h2 className="mb-1 text-lg font-medium text-text-primary">Appearance</h2>
      <p className="mb-4 text-sm text-text-secondary">
        Choose how Codex looks. "System" follows your OS setting automatically, including if you change it later.
      </p>

      <div className="grid max-w-md grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setPreference(value)}
            aria-pressed={preference === value}
            className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition ${
              preference === value
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-border text-text-secondary hover:border-accent-primary/50'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

      <p className="mt-4 max-w-md text-xs text-text-secondary">
        Saved to this device only (not synced across browsers or devices) — this is a display preference, not
        account data.
      </p>
    </div>
  );
}
