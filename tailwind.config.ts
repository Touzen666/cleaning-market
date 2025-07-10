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
    },
  },
  plugins: [scrollbar],
};
export default config;
