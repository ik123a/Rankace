import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";
import typescript from "eslint-config-next/typescript";

export default defineConfig([
  ...next,
  ...typescript,
  globalIgnores([".next/**", "public/download/**", "next-env.d.ts"])
]);
