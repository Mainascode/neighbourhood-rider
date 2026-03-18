/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/app/**/*.{js,jsx}", "./src/components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#020617",
        sand: "#f6e7c9",
        ember: "#f59e0b",
        leaf: "#34d399",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(2, 6, 23, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
