/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05060a",
          900: "#0b0e16",
          800: "#12162238",
        },
        brand: {
          400: "#7c9aff",
          500: "#5b7cfa",
          600: "#4a63e0",
        },
        status: {
          free: "#22c55e",
          held: "#f5b23a",
          booked: "#ef4444",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.35)",
        glow: "0 0 0 1px rgba(124, 154, 255, 0.25), 0 8px 24px rgba(91, 124, 250, 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
