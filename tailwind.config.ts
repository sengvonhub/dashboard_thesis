import type { Config } from "tailwindcss";
import { createThemes } from "tw-colors";
import colors from "tailwindcss/colors";
//==================>

const baseColors = [
  "gray",
  "red",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
  "pink",
];

const shadeMapping = {
  "50": "900",
  "100": "800",
  "200": "700",
  "300": "600",
  "400": "500",
  "500": "400",
  "600": "300",
  "700": "200",
  "800": "100",
  "900": "50",
};

const generateThemesObjects = (colors: any, mapping: any, invert = false) => {
  const theme: any = {};

  baseColors.forEach((color) => {
    theme[color] = {};

    Object.entries(mapping).forEach(([key, value]: any) => {
      const shadekey = invert ? value : key;
      theme[color][key] = colors[color][shadekey];
    });
  });

  return theme;
};
const lithThem = generateThemesObjects(colors, shadeMapping);
const darkThem = generateThemesObjects(colors, shadeMapping, true);
const themes = {
  light: {
    ...lithThem,
    white: "#ffffff",
  },
  dark: {
    ...darkThem,
    white: colors.gray["950"],
    black: colors.black,
  },
};
//================>
export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {},
      // These must match the custom properties actually declared in
      // globals.css. They previously pointed at --background / --foreground /
      // --border, which are defined nowhere, so `bg-background`,
      // `text-foreground` and every bare `border` utility resolved to an
      // invalid value and silently fell back to `currentColor`.
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-text-primary)",
        surface: "var(--color-surface)",
        card: "var(--color-surface-card)",
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
    },
  },
  plugins: [createThemes(themes)],
} satisfies Config;
