/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1100px" },
    },
    extend: {
      colors: {
        kpl: {
          bg: "#0B0E14",
          surface: "#151A23",
          surface2: "#1C2230",
          border: "#232A36",
          text: "#E8ECF1",
          muted: "#8B95A7",
          red: "#E63946",
          redDark: "#B02A37",
          gold: "#FFB703",
          green: "#2EC27E",
        },
      },
      fontFamily: {
        display: ['Oswald', '"Noto Sans SC"', "sans-serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(230, 57, 70, 0.35)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [],
};
