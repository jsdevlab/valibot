# @jsdevlab/valibot

Library that generates deterministic initialization data (`create`) and seedable mock data (`mock`) from valibot schemas, returning `v.InferOutput<T>`.

## Architecture

- Generators are dispatched by the `schema.type` string, **not** `instanceof` — snake_case (`exact_optional`, `loose_object`, `tuple_with_rest`). Register new valibot types in `src/generators/index.ts` via `defineGenerator(type, fn)`.
- Generation loop (`src/generate.ts`): fallback → default → instance match → type match → `NoGeneratorException`. Recursion is depth-counted per schema instance against `recursionLimit` (default 10); guard against lazy self-references.
- Constraints are read from the schema's `pipe` by action `type` string (`src/constraints.ts`, e.g. `min_length`, `iso_date_time`); string/number/date candidates are verified with `v.safeParse` + up to 20 retries (helpers in `src/utils.ts`).
- `create` runs with a fixed faker seed of 0 (deterministic); `mock` uses the caller's `seed` — same seed, same result. Both use the private `Faker` instance in `src/faker.ts` so the caller's global faker state is untouched.
- Schema constraints are hard bounds; caller options (`array`, `date`, `string`, ...) may narrow them but never violate them.

## Tooling

- `pnpm test` = `tsc --noEmit` + `tsc --noEmit -p tsconfig.typetests.json` (type-level tests in `typetests/*.test-d.ts`) + `rstest` unit tests (`src/__tests__/*.test.ts`). Coverage gate (`pnpm coverage`): statements/lines ≥ 85%, functions ≥ 90%, branches ≥ 75%.
- `pnpm check` = biome check (CI-safe; no writes), `pnpm check:fix` = biome check --write, `pnpm build` = rslib (ESM + CJS + declarations), release = changesets via GitHub Actions.
- README.md is the primary English documentation; README.zh-CN.md is the Simplified Chinese translation. npm metadata (description/keywords) is written in English.
