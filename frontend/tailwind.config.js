/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0d0d0f',
        surface: '#16161a',
        elevated: '#1e1e24',
        overlay: '#26262e',
        accent: {
          DEFAULT: '#7c6af7',
          hover: '#6b5ae6',
          light: '#7c6af720',
        },
        border: {
          subtle: '#1e1e24',
          default: '#2a2a35',
          strong: '#3a3a48',
        },
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        primary: '#f0f0f5',
        secondary: '#8b8b9e',
        muted: '#52525e',
        disabled: '#3a3a46',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
