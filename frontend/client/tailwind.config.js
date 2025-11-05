/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            h1: { fontSize: "1.125rem" },        
            h2: { fontSize: "1.05rem" },         
            'h1,h2,h3': { marginTop: "0.5rem" },
            p: { margin: "0.25rem 0" },
            li: { margin: "0.15rem 0" },
            strong: { fontWeight: "600" },
            code: { backgroundColor: "transparent" },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
