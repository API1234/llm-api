/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.html',
    './src/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00e5ff',
          pressed: '#00bcd4',
        },
        danger: {
          DEFAULT: '#dc2626',
          pressed: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
}

