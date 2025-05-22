// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: { 
      backgroundImage: {
        'gradient-custom': 'linear-gradient(to right, #32B0E6, #F3E934)',
      },
      colors: {
        primary: '#1E40AF',
        secondary: '#DB2777',
        text: '#1F2937',
      },
    },
  },
  plugins: [],
};