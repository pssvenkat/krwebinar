/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/client/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Design token bridge — all vendor-overridable via CSS variables
        primary: {
          DEFAULT: 'hsl(var(--color-primary-h) var(--color-primary-s) var(--color-primary-l))',
          50: '#f0f7f4',
          100: '#dceee7',
          200: '#b9ddd0',
          300: '#8dc5b0',
          400: '#5fa78a',
          500: '#3d8a6d',
          600: '#2d7057',
          700: '#265a47',
          800: '#1a4731',
          900: '#163d2a',
        },
        accent: {
          DEFAULT: '#f5a623',
          light: '#fbd48a',
          dark: '#d4871a',
        },
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '10px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(26, 71, 49, 0.06), 0 1px 2px -1px rgba(26, 71, 49, 0.06)',
        'card-hover': '0 4px 16px 0 rgba(26, 71, 49, 0.10), 0 2px 4px -1px rgba(26, 71, 49, 0.06)',
        'panel': '0 8px 32px 0 rgba(26, 71, 49, 0.10)',
        'modal': '0 20px 60px 0 rgba(26, 71, 49, 0.20)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
