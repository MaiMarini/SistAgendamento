/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        warm: "#fcfaf9",
        primary: {
          DEFAULT: "#8e7f7e",
          dark: "#635857",
          light: "#a08c8b",
        },
        border: "#efeae8",
        muted: "#f7f2f1",
      },
    },
  },
  plugins: [],
};
