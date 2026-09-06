import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import type { Notification } from '@/types/database';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (fetchError) {
      // A failed query must never look identical to "you have no
      // notifications" — that was a real bug: errors here were silently
      // discarded, so a genuine failure and an empty inbox were visually
      // indistinguishable to the user.
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setNotifications((data ?? []) as unknown as Notification[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function markRead(id: string) {
    const readAt = new Date().toISOString();
    const previous = notifications;
    // Optimistic update, rolled back if the write actually fails — better
    // than either blocking on the round-trip or silently ignoring an error.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)));
    const { error: updateError } = await supabase.from('notifications').update({ read_at: readAt }).eq('id', id);
    if (updateError) {
      setNotifications(previous);
      setError(`Failed to mark as read: ${updateError.message}`);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-semibold text-text-primary">Notifications</h1>
      <p className="mb-6 text-sm text-text-secondary">Product updates, security alerts, and announcements</p>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Couldn't load notifications: {error}
        </div>
      )}

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : notifications.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Bell size={28} className="mb-3 text-text-secondary" />
          <p className="text-text-primary">You're all caught up</p>
          <p className="mt-1 text-sm text-text-secondary">New notifications will show up here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start justify-between px-4 py-3 ${!n.read_at ? 'bg-accent-primary/5' : ''}`}>
              <div>
                <p className="font-medium text-text-primary">{n.title}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{n.body}</p>
                <p className="mt-1 text-xs text-text-secondary">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read_at && (
                <button
                  onClick={() => markRead(n.id)}
                  aria-label="Mark as read"
                  className="shrink-0 text-text-secondary hover:text-success"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
