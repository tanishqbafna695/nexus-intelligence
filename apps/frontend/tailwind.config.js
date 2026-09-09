/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#08090B',
        surface: '#0F1115',
        'surface-elevated': '#151820',
        'surface-border': 'rgba(255, 255, 255, 0.08)',
        'text-primary': '#F5F5F2',
        'text-secondary': '#949AA6',
        'text-muted': '#5E6470',
        accent: {
          emerald: '#10B981',
          cyan: '#06B6D4',
          blue: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
