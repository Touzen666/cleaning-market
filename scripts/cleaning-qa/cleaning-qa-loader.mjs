import { createRequire, isBuiltin } from "node:module";
import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(root + "/package.json");
const ts = require("typescript");
const here = new URL(".", import.meta.url);
export async function resolve(specifier, context, next) {
  if (isBuiltin(specifier)) return next(specifier, context);
  if (specifier === "@/server/api/trpc")
    return {
      url: new URL("cleaning-qa-trpc.mjs", here).href,
      shortCircuit: true,
    };
  if (specifier === "@/env")
    return {
      url: new URL("cleaning-qa-env.mjs", here).href,
      shortCircuit: true,
    };
  let url;
  if (specifier.startsWith("@/"))
    url = pathToFileURL(root + "/src/" + specifier.slice(2) + ".ts").href;
  else if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts"))
    url = new URL(
      specifier + (path.extname(specifier) ? "" : ".ts"),
      context.parentURL,
    ).href;
  if (url && /\/cleaning\/(snapshot|guest-counts)\.ts$/.test(url))
    return {
      url: new URL("cleaning-qa-source.mjs", here).href,
      shortCircuit: true,
    };
  if (url) return { url, shortCircuit: true };
  if (
    !specifier.startsWith(".") &&
    !specifier.startsWith("node:") &&
    !specifier.startsWith("file:") &&
    !specifier.startsWith("/")
  ) {
    try {
      return {
        url: pathToFileURL(require.resolve(specifier)).href,
        shortCircuit: true,
      };
    } catch {}
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith(".ts")) {
    let source = await readFile(fileURLToPath(url), "utf8");
    if (url.endsWith("/cleaning/workforce-domain.ts"))
      source = source.replace(
        "now = new Date()",
        "now = new Date(globalThis.__cleaningQaNow ?? Date.now())",
      );
    return {
      format: "module",
      source: ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      shortCircuit: true,
    };
  }
  return next(url, context);
}
