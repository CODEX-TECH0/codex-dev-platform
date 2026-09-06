import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'codex-theme';

function resolveIsDark(pref: ThemePreference): boolean {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return pref === 'dark';
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
  });

  useEffect(() => {
    applyTheme(resolveIsDark(preference));

    if (preference !== 'system') return;

    // Live-update if the OS-level preference changes while "system" is selected.
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(resolveIsDark('system'));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  function setPreference(pref: ThemePreference) {
    localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
  }

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Resolves the *actual* current dark/light state (not just the stored
 * preference — "system" needs to be resolved against the OS setting) and
 * re-renders on change. For consumers that can't rely on CSS custom
 * properties alone, e.g. Recharts components, which take hex color props
 * directly rather than CSS classes and so don't participate in the
 * `.dark`-class-driven CSS variable system used everywhere else.
 */
export function useIsDarkMode(): boolean {
  const { preference } = useTheme();
  const [isDark, setIsDark] = useState(() => resolveIsDark(preference));

  useEffect(() => {
    setIsDark(resolveIsDark(preference));
    if (preference !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(resolveIsDark('system'));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  return isDark;
}
