/**
 * Side-effect polyfill — MUST be imported before `mongoose`.
 *
 * Next.js bundlers expose a partial `process` object on `globalThis` that is
 * missing `process.getBuiltinModule` (which also does not exist on Node < 20.16
 * / Node 21.x). The `bson` package — a transitive dependency of `mongoose` —
 * runs `globalThis?.process?.getBuiltinModule('v8')` at module-evaluation time,
 * and mongoose's tracing runs `process.getBuiltinModule('node:diagnostics_channel')`.
 * Without this, those calls throw and every DB-backed API route returns 500.
 */
import * as v8 from "node:v8";
import * as diagnosticsChannel from "node:diagnostics_channel";

const proc = globalThis.process as NodeJS.Process & {
  getBuiltinModule?: (id: string) => unknown;
};

if (proc && typeof proc.getBuiltinModule !== "function") {
  const builtins: Record<string, unknown> = {
    v8,
    "node:v8": v8,
    diagnostics_channel: diagnosticsChannel,
    "node:diagnostics_channel": diagnosticsChannel,
  };
  proc.getBuiltinModule = (id: string) => builtins[id];
}
