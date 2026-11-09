import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Images are uploaded through the CMS and served by Django from /media.
      "@next/next/no-img-element": "off",
    },
  },
  // .trail/ holds a developer tool's hook script, not website code.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", ".trail/**"] },
];

export default config;
