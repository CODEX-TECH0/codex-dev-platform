/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F14',
        surface: '#151B23',
        border: '#263241',
        accent: {
          primary: '#3B82F6',
          secondary: '#22D3EE'
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8'
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444'
      }
    }
  },
  plugins: []
};
