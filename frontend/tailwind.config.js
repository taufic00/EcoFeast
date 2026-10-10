/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        eco: {
          green: "#10a37f",
          dark: "#0b7a5f"
        }
      }
    },
  },
  plugins: [],
}
