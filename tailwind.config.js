/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Deep green-black used for sidebar and dark text
        navy: {
          50:  '#f0f4f1',
          100: '#d8e6dc',
          200: '#b0cab9',
          300: '#87ae96',
          400: '#5e9272',
          500: '#3b7551',
          600: '#2b5a3c',
          700: '#1d3e2a',
          800: '#122518',
          900: '#0c180f',
          950: '#060c07',
        },
        // NNPC Ltd primary brand green — used for CTAs, active states, accents
        flame: {
          50:  '#f0faf4',
          100: '#d0f0e0',
          200: '#a0e0c0',
          300: '#5fcc96',
          400: '#26b06b',
          500: '#008751',  // NNPC primary green
          600: '#006b40',
          700: '#005030',
          800: '#003820',
          900: '#002214',
        },
        // NNPC amber/gold — used for safety warnings and secondary highlights
        safety: {
          50:  '#fffef0',
          100: '#fef8c3',
          200: '#fdef87',
          300: '#fde047',
          400: '#fbca14',
          500: '#f0a500',  // NNPC gold
          600: '#d48600',
          700: '#a96900',
          800: '#7c4e00',
          900: '#573600',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        panel: '0 4px 16px rgba(0,0,0,0.12)',
        glow: '0 0 0 3px rgba(0, 135, 81, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1.5s steps(3, end) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        typing: { '0%, 100%': { content: '...' }, '33%': { content: '.' }, '66%': { content: '..' } },
      },
    },
  },
  plugins: [],
};
