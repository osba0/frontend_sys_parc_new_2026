/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette principale du projet (bleue marine sénégalaise)
        primary: {
          50:  '#EBF5FB',
          100: '#D6EAF8',
          200: '#AED6F1',
          300: '#85C1E9',
          400: '#5DADE2',
          500: '#2E86C1',
          600: '#2874A6',
          700: '#1B4F72',
          800: '#154360',
          900: '#0E2D42',
        },
        // Couleurs des statuts
        success: { light: '#D5F5E3', DEFAULT: '#27AE60', dark: '#1E8449' },
        warning: { light: '#FEF9E7', DEFAULT: '#F39C12', dark: '#9A7D0A' },
        danger:  { light: '#FDEDEC', DEFAULT: '#E74C3C', dark: '#922B21' },
        info:    { light: '#EAF4FB', DEFAULT: '#3498DB', dark: '#154360' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
