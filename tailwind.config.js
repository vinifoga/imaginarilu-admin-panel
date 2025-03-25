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
        // Cores personalizadas
        primary: '#1E40AF', // Azul escuro
        secondary: '#DB2777', // Rosa
        text: '#1F2937', // Cinza escuro
      },
    },
  },
  plugins: [],
};