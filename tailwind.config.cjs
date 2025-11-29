/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          900: "#020617",
          800: "#0f172a",
          700: "#1e293b",
        },
      },
    },
  },
  plugins: [],
};
