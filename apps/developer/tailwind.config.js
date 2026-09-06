/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // These read from CSS custom properties (defined per-theme in
        // index.css under :root and .dark) so that toggling the `dark`
        // class on <html> — driven by ThemeContext — actually changes every
        // component using these tokens application-wide, not just a
        // cosmetic flag. Accent/semantic colors intentionally do NOT vary
        // by theme; only surface/text/border tokens do.
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: {
          primary: '#3B82F6',
          secondary: '#22D3EE'
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)'
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444'
      }
    }
  },
  plugins: []
};
