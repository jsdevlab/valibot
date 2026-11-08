# @jsdevlab/valibot

Library that generates deterministic initialization data (`create`) and seedable mock data (`mock`) from valibot schemas, returning `v.InferOutput<T>`.

## Architecture

- Generators are dispatched by the `schema.type` string, **not** `instanceof` — snake_case (`exact_optional`, `loose_object`, `tuple_with_rest`). Register new valibot types in `src/generators/index.ts` via `defineGenerator(type, fn)`.
- Generation loop (`src/generate.ts`): fallback → default → instance match → type match → `NoGeneratorException`. Recursion is depth-counted per schema instance against `recursionLimit` (default 10); guard against lazy self-references.
- Constraints are read from the schema's `pipe` by action `type` string (`src/constraints.ts`, e.g. `min_length`, `iso_date_time`); string/number/date candidates are verified with `v.safeParse` + up to 20 retries (helpers in `src/utils.ts`).
- `create` runs with a fixed faker seed of 0 (deterministic); `mock` uses the caller's `seed` — same seed, same result. Both use the private `Faker` instance in `src/faker.ts`, so the caller's global faker state is untouched.
- Schema constraints are hard bounds; caller options (`array`, `date`, `string`, ...) may narrow them but never violate them.
- Follow `rslib-best-practices` and `rstest-best-practices` (local skills synced from `rstackjs/agent-skills`).

## Universal runtime (Node.js + browser)

- Supported runtimes: Node.js `^20.19.0 || >=22.12.0`, and ES2022 browsers (Chrome/Edge 94+, Firefox 93+, Safari 15.4+). No runtime polyfills are injected; avoid newer APIs without a fallback.
- Source code must only use APIs available in both environments. Allowed environment globals include `Blob`, `File`, `btoa`, `Promise`, `Symbol`, `BigInt`, `Date`, `Map`, `Set`, `URL`.
- **Never** import `node:*` or use `process`, `Buffer`, `__dirname`, `require`, `fs`, `path`, `crypto` in `src/` (tests may run under Node, but `src/__tests__/browser.test.ts` must stay universal).
- The build uses `output.target: 'web'` and `syntax: 'es2022'`; the same `dist` runs in browsers and Node.js. Do not add Node-only build plugins or polyfills without a browser-safe plan.
- `src/__tests__/browser.test.ts` runs in both Node.js (default project) and real Chromium (Browser Mode). Keep it free of Node-specific APIs.

## Build and package contract

- `pnpm build` = Rslib 1.x: ESM (`dist/index.js`) + CJS (`dist/index.cjs`) + bundled declarations (`dist/index.d.ts`, `dist/index.d.cts` via `dts.autoExtension`).
- `package.json#exports` is the public contract: `import` → ESM/types, `require` → CJS/types. Keep `main`, `types`, `files`, `sideEffects`, and `engines` consistent with the actual output.
- `@faker-js/faker` stays a runtime `dependency`; `valibot` is a `peerDependency`. Build/test tools stay in `devDependencies`.
- `@microsoft/api-extractor` is required by `dts.bundle`; `dts.autoExtension` selects `.d.ts`/`.d.cts`.
- Build cache/temp directories: `.rstack/` (gitignored), plus legacy `.rslib/`.
- Publishing runs through changesets and GitHub Actions. Inspect the tarball with `npm pack --dry-run` before release.

## Testing

- `pnpm test` = `tsc --noEmit` + `tsc --noEmit -p tsconfig.typetests.json` (type-level tests in `typetests/*.test-d.ts`) + Node.js `rstest` tests (`src/__tests__/*.test.ts`).
- `pnpm test:browser` = Rstest Browser Mode (`rstest.browser.config.ts`) against real Chromium. Run `pnpm exec playwright install chromium` once first.
- `pnpm test:all` = Node.js + browser tests.
- `pnpm coverage` enforces: statements/lines ≥ 85%, functions ≥ 90%, branches ≥ 75%.
- CI runs biome check, Node tests, coverage, Playwright Chromium setup, browser tests, and the build.

## Tooling

- `pnpm check` = Biome check (CI-safe, no writes); `pnpm check:fix` = Biome check with writes; `pnpm format` = Biome format.
- `pnpm build` = Rslib; `pnpm dev` = `rslib --watch`; release = changesets.
- README.md is the primary English documentation; README.zh-CN.md is the Simplified Chinese translation. npm metadata (description/keywords) is written in English.
- Prefer explicit imports from `@rstest/core`; never commit `.only`; keep test files environment-agnostic unless placed in a browser-only suite.
