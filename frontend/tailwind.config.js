/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        swiggy: {
          orange: '#FC8019',
          'orange-dark': '#e06c0e',
          'orange-light': '#FFF3E9',
          green: '#60b246',
          'green-dark': '#3d8b27',
          gray: '#f4f4f4',
          'gray-dark': '#8a8a8a',
          dark: '#282c3f',
          'dark-light': '#3d4152',
          red: '#ff0000',
          yellow: '#f4c430',
        },
      },
      fontFamily: {
        sans: ['Okra', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.12)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.18)',
        nav: '0 2px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
