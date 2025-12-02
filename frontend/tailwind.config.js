/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Oneo Brand Colors
        primary: {
          DEFAULT: '#003E49',  // Dark Blue/Green
          dark: '#002A32',
          light: '#0D646D',    // Light Blue
        },
        secondary: {
          DEFAULT: '#0D646D',  // Light Blue
          dark: '#064852',
          light: '#1A7A88',
        },
        accent: {
          DEFAULT: '#FF7B55',  // Orange
          dark: '#E65A35',
          light: '#FFAB97',    // Light Orange
        },
        // Additional utility colors
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 62, 73, 0.1), 0 1px 2px 0 rgba(0, 62, 73, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 62, 73, 0.1), 0 2px 4px -1px rgba(0, 62, 73, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
