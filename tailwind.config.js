/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0C0B09',
          900: '#161410',
          800: '#1E1C17',
          700: '#2A2720',
          600: '#3D382E',
          500: '#57503F',
          400: '#8A7F72',
          300: '#B5AB9C',
          200: '#D4CCB8',
          100: '#EDE8DF',
          50:  '#F7F4EE',
        },
        amber: {
          DEFAULT: '#C9954C',
          light: '#E8B062',
          dim: '#8A6130',
          muted: '#4A3520',
        },
        crimson: {
          DEFAULT: '#A8352F',
          light: '#C94040',
          dim: '#6B1F1B',
          muted: '#3D1210',
        },
        sage: {
          DEFAULT: '#4A7C59',
          light: '#5F9E72',
          dim: '#2E5038',
          muted: '#1A2E20',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.4, 0, 1, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
