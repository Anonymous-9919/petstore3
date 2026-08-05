import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ff6600",
          light: "#ff8533",
          soft: "#fff4ec"
        },
        page: "#f4f5f5",
        ink: {
          DEFAULT: "rgba(0,0,0,0.87)",
          secondary: "rgba(0,0,0,0.54)"
        },
        success: "#29ac00"
      },
      fontFamily: {
        sans: ["Quicksand", "Cairo", "Quicksand Fallback", "Cairo Fallback", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 3px 1px rgba(0,0,0,0.15)",
        float: "0 0 10px 1px rgb(0 0 0 / 10%)"
      },
      borderRadius: {
        card: "20px",
        product: "25px"
      },
      spacing: {
        nav: "72px"
      }
    }
  },
  plugins: []
};

export default config;
