/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // This project is on Tailwind v3 (see devDependencies + the `@tailwind`
    // directives in globals.css). The v4-only `@tailwindcss/postcss` plugin
    // must NOT be listed alongside it — running both engines over the same
    // stylesheet is unsupported and breaks unpredictably on reinstall.
    tailwindcss: {},
  },
};

export default config;
