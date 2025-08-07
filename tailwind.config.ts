import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import scrollbar from "tailwind-scrollbar";

const config: Config = {
  safelist: ["bg-brand-gold"],
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        "brand-gold": "#E7AA3D",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
      keyframes: {
        ripple: {
          "0%": {
            transform: "scale(0)",
            opacity: "0.3",
          },
          "100%": {
            transform: "scale(4)",
            opacity: "0",
          },
        },
      },
      animation: {
        ripple: "ripple 0.6s linear",
      },
    },
  },
  plugins: [scrollbar],
};
export default config;
