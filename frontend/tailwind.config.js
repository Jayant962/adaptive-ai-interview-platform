/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        rawWhite: '#ffffff',
        white: 'rgb(var(--color-white) / <alpha-value>)',
        gray: {
          300: 'rgb(var(--color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--color-gray-500) / <alpha-value>)',
        },
        primary: {
          50: '#f0f0ff',
          100: '#e4e4ff',
          200: '#cdcbfe',
          300: '#a9a4fb',
          400: '#7f77dd',
          500: '#6d5fe8',
          600: '#5c46d3',
          700: '#4e38b9',
          800: '#3c2e8e',
          900: '#2d2270',
          950: '#1a1244',
        },
        dark: {
          900: 'rgb(var(--color-dark-900) / <alpha-value>)',
          800: 'rgb(var(--color-dark-800) / <alpha-value>)',
          700: 'rgb(var(--color-dark-700) / <alpha-value>)',
          600: 'rgb(var(--color-dark-600) / <alpha-value>)',
          500: 'rgb(var(--color-dark-500) / <alpha-value>)',
          400: 'rgb(var(--color-dark-400) / <alpha-value>)',
          300: 'rgb(var(--color-dark-300) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
        'recording': 'recording 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        recording: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #1a1244 0%, #0f0f1a 50%, #0a0a0f 100%)',
      }
    },
  },
  plugins: [],
}
