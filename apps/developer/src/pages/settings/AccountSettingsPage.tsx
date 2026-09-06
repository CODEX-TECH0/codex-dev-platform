import { useState, type FormEvent } from 'react';
import { SettingsTabs } from '@/components/SettingsTabs';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState((user?.user_metadata?.full_name as string) ?? '');
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) setNameError(error.message);
    else {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    }
  }

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    // Supabase sends confirmation links to BOTH the old and new address by
    // default (project-configurable) — this is the built-in reauthentication
    // safeguard for a sensitive change like this, rather than something
    // this app needs to implement itself.
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setEmailError(error.message);
    else {
      setEmailSubmitted(true);
      setNewEmail('');
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Settings</h1>
      <SettingsTabs />

      <h2 className="mb-4 text-lg font-medium text-text-primary">Account</h2>

      <form onSubmit={handleSaveName} className="mb-6 max-w-md space-y-4 rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-medium text-text-primary">Profile</h3>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
          />
        </div>
        {nameError && <p className="text-sm text-danger">{nameError}</p>}
        <button type="submit" className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white">
          {nameSaved ? 'Saved' : 'Save name'}
        </button>
      </form>

      <form onSubmit={handleChangeEmail} className="max-w-md space-y-4 rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-medium text-text-primary">Email address</h3>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Current email</label>
          <input
            disabled
            value={user?.email ?? ''}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-secondary"
          />
        </div>
        {emailSubmitted ? (
          <p className="text-sm text-success">
            Confirmation links sent to your current and new address — the change applies once both are confirmed.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">New email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              />
            </div>
            {emailError && <p className="text-sm text-danger">{emailError}</p>}
            <button type="submit" className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white">
              Update email
            </button>
          </>
        )}
      </form>
    </div>
  );
}
