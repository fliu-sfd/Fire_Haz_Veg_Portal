// Lets node --test load source files that import through the "@/" alias,
// which only TypeScript and Next know about.
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const srcUrl = new URL("../../src/", import.meta.url);

function isFile(url) {
  const path = fileURLToPath(url);
  return existsSync(path) && statSync(path).isFile();
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), srcUrl).href;
      const match = [`${base}.ts`, `${base}/index.ts`, base].find(isFile);
      if (match) return nextResolve(match, context);
    }
    return nextResolve(specifier, context);
  },
});
