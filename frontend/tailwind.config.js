/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Admin palette — Dark Ops
        admin: {
          bg:       '#060d18',
          sidebar:  '#0d1a2e',
          card:     '#112240',
          elevated: '#1a3050',
          teal:     '#00e5cc',
          blue:     '#2979ff',
          red:      '#8B2020',
          amber:    '#7A5C1E',
          info:     '#1A3A5C',
        },
        // User palette — Forest Nature
        nature: {
          bg:      '#1a2e1a',
          card:    '#2d5a27',
          accent:  '#7fb069',
          gold:    '#d4a843',
          cream:   '#f5f0e8',
          dark:    '#0f1f0f',
        },
      },
      fontFamily: {
        sans:  ['Space Grotesk', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
        nature: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
        'count-up':   'countUp 1s ease-out',
      },
      keyframes: {
        pulseRing: {
          '0%':   { transform: 'scale(1)',   opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
