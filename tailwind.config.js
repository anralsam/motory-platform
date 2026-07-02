/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Riyal', 'var(--font-tajawal)', 'Tajawal', 'Almarai', 'system-ui', 'sans-serif'],
        inter: ['Riyal', 'var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          violet: '#7c3aed',
        },
        // Grand Unified DNA tokens — single source of truth for the dashboards.
        accent: '#2563eb', // buttons / active states
        secondary: '#64748b', // secondary labels
        surface: '#f8fafc', // global background
        line: '#e2e8f0', // all borders
      },
      // Global Style Guide — the ONLY two elevations across the whole app.
      // shadow-sm → flat cards · shadow-lg → interactive/raised elements.
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        DEFAULT: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 1px 2px rgba(0,0,0,0.05)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
        xl: '0 10px 15px -3px rgba(0,0,0,0.1)',
        '2xl': '0 10px 15px -3px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
