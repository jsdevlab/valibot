# @jsdevlab/valibot

Generate **deterministic initialization data** and **seedable mock data** from [valibot](https://valibot.dev) schemas.

`create` produces form-friendly blank objects that still satisfy the schema; `mock` produces random data that respects schema constraints. Both return `v.InferOutput<T>`, so every generated value is fully type-inferred from the schema.

**English** | [简体中文](./README.zh-CN.md)

## Features

- **Schema-first** — works directly with valibot schemas, no separate DSL or code generation.
- **Two modes** — `create` for deterministic initial values, `mock` for reproducible random data.
- **Constraint-aware** — honors length, range, format, regex, `startsWith`/`endsWith`, `includes`/`excludes`, size and entry constraints.
- **Reproducible** — the same seed produces the same result (for a given faker version).
- **Type-safe** — the return type is `v.InferOutput<T>`; `defaults` is checked as `DeepPartial<v.InferOutput<T>>`.
- **Extensible** — register custom generators by schema instance or schema type; they take precedence over built-ins.
- **Non-invasive** — uses a private faker instance, so your application's global faker seed and random state are untouched.
- **Universal** — runs in Node.js and modern browsers; the browser build is tested in real Chromium with Rstest Browser Mode.
- **Dual format** — ships ESM and CommonJS builds with TypeScript declarations.

## Requirements

- Node.js `^20.19.0 || >=22.12.0` (the library uses the global `Blob`, `File` and `btoa`).
- Modern ES2022 browsers (Chrome/Edge 94+, Firefox 93+, Safari 15.4+) with the same globals. No runtime polyfills are injected.
- Peer dependency: `valibot ^1.5.0`.

## Installation

```bash
pnpm add @jsdevlab/valibot valibot
```

```bash
npm install @jsdevlab/valibot valibot
```

```bash
yarn add @jsdevlab/valibot valibot
```

Both module formats are supported:

```ts
// ESM / TypeScript
import { create, mock } from '@jsdevlab/valibot';

// CommonJS
const { create, mock } = require('@jsdevlab/valibot');
```

## Quick start

```ts
import * as v from 'valibot';
import { create, mock } from '@jsdevlab/valibot';

const userSchema = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  role: v.enum({ Admin: 'admin', User: 'user' }),
  page: v.optional(v.number(), 1), // default value
  note: v.fallback(v.string(), 'n/a'), // fallback value
  tags: v.array(v.string()),
});

// Deterministic initialization (for example, form defaults)
const init = create(userSchema);
// {
//   name: '',
//   email: 'Johnathon_Kertzmann@hotmail.com', // deterministic, seed 0
//   role: 'admin',
//   page: 1,
//   note: 'n/a',
//   tags: []
// }

// Random mock data (tests, demos, fixtures) — reproducible with the same seed
const fakeUser = mock(userSchema, { seed: 42 });
// { name: 'XMFiidTFKb', email: 'Collin.Leffler@yahoo.com', role: 'admin',
//   page: 1, note: 'n/a', tags: ['xOkAEcFidX', 'QpfJwgzbVnIqBCjYOWUF', ...] }

// Override any field of the generated result (compile-time checked deep partial)
const draft = create(userSchema, {
  defaults: { name: 'Alice', role: 'admin' },
});
// { name: 'Alice', email: 'Johnathon_Kertzmann@hotmail.com', ... }
```

> Example values come from the pinned faker version. They can change when faker updates its random sequences; determinism is guaranteed per faker version.

## API

### `create(schema, options?)`

Generates deterministic initialization data.

- Uses field default values (`v.optional(schema, default)`, `v.nullable(schema, default)`) and `v.fallback(...)` values when enabled.
- Returns the "smallest valid" value where possible: `''` for unconstrained strings, `0` for numbers, `false` for booleans, `[]` for arrays, `{}` for records, `new Map()` / `new Set()` for maps and sets, and all object fields populated.
- Respects minimum constraints: `v.minLength(3)` produces three characters, `v.size(3)` produces three map/set/blob/file entries, `v.minValue(5)` produces `5`, and so on.
- For schemas that cannot be generated (`v.function()`, `v.custom()`, `v.never()`), throws by default. Provide `defaults`, a custom generator, or set `unhandled: 'skip'`.

### `mock(schema, options?)`

Generates reproducible random data.

- Uses faker for strings, dates and formatted values.
- Applies the schema constraints listed in [Supported constraints](#supported-constraints).
- `seed` defaults to `1`; the same seed and schema produce the same output for a given faker version.
- Default and fallback values take precedence in both modes by default (disable with `useDefault` / `useFallback`).

### Options

Both functions accept the same options; `defaults` is additionally typed by the schema.

| Option           | Type                                      | Default                     | Description                                                                      |
| ---------------- | ----------------------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `seed`           | `number`                                  | `1`                         | Random seed for `mock` (`create` always uses seed `0`).                          |
| `recursionLimit` | `number`                                  | `10`                        | Maximum recursion depth for lazy self-references.                                |
| `generators`     | `GeneratorDefinition[]`                   | `[]`                        | Custom generators matched by instance or `schema.type`; they win over built-ins. |
| `array`          | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | Array length range. Intersected with `minLength`/`maxLength`.                    |
| `record`         | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | Record entry count range.                                                        |
| `map`            | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | Map entry count range.                                                           |
| `set`            | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | Set entry count range.                                                           |
| `optional`       | `{ chance? }`                             | `{ chance: 0.3 }`           | Probability of producing `undefined` for `v.optional()` in mock mode.            |
| `nullable`       | `{ chance? }`                             | `{ chance: 0.3 }`           | Probability of producing `null` for `v.nullable()` in mock mode.                 |
| `useDefault`     | `boolean`                                 | `true`                      | Prefer schema default values.                                                    |
| `useFallback`    | `boolean`                                 | `true`                      | Prefer `v.fallback()` values.                                                    |
| `unhandled`      | `'throw' \| 'skip'`                       | `'throw'`                   | Behavior for ungeneratable schemas: throw or return `undefined`.                 |
| `date`           | `{ min?: Date; max?: Date }`              | `1970-01-01` – `2100-01-01` | Date range. Intersected with date constraints.                                   |
| `string`         | `{ length?: number \| [number, number] }` | `[5, 20]`                   | String length (or range). Intersected with schema constraints.                   |
| `defaults`       | `DeepPartial<v.InferOutput<T>>`           | —                           | Field overrides, deep-merged into the result.                                    |

### `defaults` semantics

- The type is `DeepPartial<v.InferOutput<T>>`, so unknown fields and wrong value types are compile-time errors.
- Plain objects are merged recursively; all other values replace the generated value.
- `null`, arrays and class instances (including `Map` / `Set` / `Date`) replace instead of being merged.
- Values are also used as a fallback source for schemas that cannot be generated (for example `v.custom()`).
- `undefined` means "no override"; it does not clear a generated field.

```ts
const schema = v.object({
  profile: v.object({ name: v.string(), age: v.number() }),
  tags: v.array(v.string()),
  note: v.union([v.string(), v.null()]),
});

const value = create(schema, {
  defaults: {
    profile: { name: 'Alice' }, // age is still generated
    tags: ['admin'], // arrays are replaced, not merged
    note: null, // null is an explicit override
  },
});
```

### Custom generators

A generator receives the current schema and the generation context and may return any value.

```ts
import * as v from 'valibot';
import { create, mock } from '@jsdevlab/valibot';

const idSchema = v.pipe(v.string(), v.uuid());

// Match a specific schema instance
mock(schema, {
  generators: [
    {
      schema: idSchema,
      generator: () => '00000000-0000-4000-8000-000000000000',
    },
  ],
});

// Match every schema of a given type (overrides the built-in generator)
create(schema, {
  generators: [{ type: 'number', generator: () => 42 }],
});

// Read the current context (mode, path, options, ...)
mock(schema, {
  generators: [
    {
      type: 'string',
      generator: (_schema, ctx) => `field_${ctx.path.join('_')}`,
    },
  ],
});
```

`ctx` exposes:

- `mode`: `'init'` or `'mock'`
- `path`: the current field path (`Array<string | number>`)
- `options`: normalized generation options
- `random`: a faker-backed `Random` helper (`float`, `int`, `pick`, `chance`, `string`)
- `defaults`: the caller-provided defaults
- `recursion`: the per-run recursion counter

### Exceptions

```ts
import {
  NoGeneratorException,
  RecursionLimitReachedException,
} from '@jsdevlab/valibot';

try {
  create(v.function());
} catch (error) {
  if (error instanceof NoGeneratorException) {
    // no generator for a schema type
  }
}
```

Both classes are exported as runtime values, not only as types.

## How it works

1. **Fallback and default values** — a schema with `v.fallback(...)` or an optional/nullable default returns that value (when enabled).
2. **Custom generators** — matched by schema instance first, then by `schema.type`.
3. **Built-in generators** — dispatched by the valibot `schema.type` string (for example `exact_optional`, `object_with_rest`), never by `instanceof`.
4. **Validation fallback** — string, number and date candidates are checked with `v.safeParse`; up to 20 attempts are made for constraints such as `regex`, `includes`, `multipleOf` and date ranges.
5. **Recursion guard** — lazy self-references are counted per schema instance against `recursionLimit`; exceeding it throws `RecursionLimitReachedException`.

Constraints are read from the schema's `pipe` by action `type` string. Schema constraints are hard bounds; caller options can narrow but not violate them.

## Supported schema types

| Category        | valibot schemas                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Scalars         | `string`, `number`, `bigint`, `boolean`, `date`, `nan`, `symbol`, `instance`                                                       |
| Literals        | `literal`, `enum`, `picklist`                                                                                                      |
| Objects         | `object`, `looseObject`, `strictObject`, `objectWithRest`                                                                          |
| Containers      | `array`, `tuple`, `looseTuple`, `strictTuple`, `tupleWithRest`, `record`, `map`, `set`, `blob`, `file`                             |
| Composites      | `union`, `variant`, `intersect`                                                                                                    |
| Wrappers        | `optional`, `nullable`, `nullish`, `undefinedable`, `exactOptional`, `nonNullable`, `nonNullish`, `nonOptional`, `lazy`, `promise` |
| Unstructured    | `any`, `unknown`, `undefined`, `null`, `void`, `never`                                                                             |
| Not generatable | `function`, `custom`                                                                                                               |

Behavior by mode:

| Schema                                       | `create`                                 | `mock`                                        |
| -------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| `string`                                     | `''`, or the minimum valid string        | random string honoring constraints            |
| `number` / `bigint`                          | `0` clamped into range                   | random value in range                         |
| `boolean`                                    | `false`                                  | random                                        |
| `date`                                       | epoch, clamped into range                | random date in range                          |
| `literal` / `enum` / `picklist`              | first value                              | random value                                  |
| `union` / `variant`                          | first branch                             | random branch                                 |
| `intersect`                                  | merged object branches                   | merged object branches                        |
| `array`                                      | `[]`, or `minLength` items               | random length                                 |
| `tuple*`                                     | all fixed items                          | all fixed items (+ rest for tuple-with-rest)  |
| `record` / `map` / `set`                     | empty, unless a minimum size is required | random size                                   |
| `object*`                                    | all entries                              | all entries (+ extras for loose/rest objects) |
| `optional` / `undefinedable`                 | `undefined`                              | `undefined` with a chance                     |
| `nullable` / `nullish`                       | `null`                                   | `null`/`undefined` with a chance              |
| `exactOptional`                              | inner value                              | inner value                                   |
| `nonNullable` / `nonNullish` / `nonOptional` | inner value                              | inner value                                   |
| `lazy`                                       | inner value                              | inner value                                   |
| `promise`                                    | `Promise.resolve(undefined)`             | `Promise.resolve(undefined)`                  |
| `instance`                                   | new no-arg instance, or prototype object | same                                          |
| `any` / `unknown`                            | `undefined`                              | `0`, `''`, `false` or `null`                  |
| `undefined` / `void`                         | `undefined`                              | `undefined`                                   |
| `null`                                       | `null`                                   | `null`                                        |
| `never`                                      | throws / `defaults` / skip               | same                                          |
| `function` / `custom`                        | throws / `defaults` / skip               | same                                          |

> `v.brand()`, `v.flavor()`, `v.description()` and other metadata/transformation actions are ignored: generation targets the base type, and validation still runs on the pipe.

## Supported constraints

| Input                   | Actions                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| string                  | `minLength`, `maxLength`, `length`, `nonEmpty`, `empty`, `minBytes`, `maxBytes`, `minCodePoints`, `maxCodePoints`, `minGraphemes`, `maxGraphemes`, `regex`, `includes`, `excludes`, `startsWith`, `endsWith`                                                                                                                                                                                 |
| string formats          | `email`, `rfcEmail`, `url`, `uuid`, `ip`, `ipv4`, `ipv6`, `mac`, `mac48`, `mac64`, `isoDate`, `isoTime`, `isoTimeSecond`, `isoDateTime`, `isoDateTimeSecond`, `isoTimestamp`, `isoWeek`, `emoji`, `base64`, `decimal`, `digits`, `hexadecimal`, `octal`, `slug`, `domain`, `bic`, `creditCard`, `hexColor`, `imei`, `isbn`, `isrc`, `jwsCompact`, `ksuid`, `cuid2`, `nanoid`, `ulid`, `hash` |
| number                  | `minValue`, `maxValue`, `gtValue`, `ltValue`, `integer`, `safeInteger`, `multipleOf`                                                                                                                                                                                                                                                                                                         |
| bigint                  | `minValue`, `maxValue`, `gtValue`, `ltValue`, `multipleOf`                                                                                                                                                                                                                                                                                                                                   |
| date                    | `minValue`, `maxValue`, `gtValue`, `ltValue`                                                                                                                                                                                                                                                                                                                                                 |
| array                   | `minLength`, `maxLength`, `nonEmpty`, `empty`                                                                                                                                                                                                                                                                                                                                                |
| record                  | `minEntries`, `maxEntries`                                                                                                                                                                                                                                                                                                                                                                   |
| map / set / blob / file | `minSize`, `maxSize`, `size`                                                                                                                                                                                                                                                                                                                                                                 |

Generation is best-effort for constraints that cannot be introspected, such as arbitrary `v.check()` predicates. A candidate that still fails validation after 20 attempts is returned as-is.

## Determinism

- `create` seeds faker with `0`; the output is deterministic.
- `mock` uses the caller's `seed` (default `1`).
- Generation is synchronous and consumes faker's random sequence in schema order. Changing the schema or faker version can change the produced values, but the same input always yields the same output within a version.
- `create`/`mock` use a private faker instance; they never change the global faker seed used by your application.

## TypeScript

```ts
import * as v from 'valibot';
import type { DeepPartial } from '@jsdevlab/valibot';
import { create } from '@jsdevlab/valibot';

const schema = v.object({ name: v.string(), age: v.number() });

type User = v.InferOutput<typeof schema>; // { name: string; age: number }

const user: User = create(schema);

const patch: DeepPartial<User> = { name: 'Alice' };
create(schema, { defaults: patch });

// @ts-expect-error `age` must be a number
create(schema, { defaults: { age: 'old' } });
```

## Limitations

- **Custom predicates are opaque.** `v.check()`, `v.custom()` and `v.function()` cannot be introspected. Use `defaults`, a custom generator, or `unhandled: 'skip'`.
- **Transformations are not applied.** When a pipe contains transformations (`v.trim()`, `v.toLowerCase()`, `v.transform()`, ...), the raw pre-transform value is generated and returned. Running the schema through `v.parse` applies the transformations.
- **Async schemas are not supported.** `v.lazy(async ...)` throws, and asynchronous `v.check` actions cannot be satisfied by the synchronous validation loop. `v.promise()` returns `Promise.resolve(undefined)` because its inner value is not inspectable.
- **Regex generation is best effort.** It uses faker's `fromRegExp` with `\d`/`\w`/`\s` translated to character classes. Lookarounds, alternation and Unicode property escapes may not be reproducible; after 20 attempts the last candidate is returned.
- **Fractional `multipleOf`** values that are not exactly representable in binary (for example `0.1`) may fail JavaScript's `%` check even when mathematically valid.
- **Unique containers** (`record`/`map`/`set`) may end up smaller than requested when the value schema can only produce one distinct value (for example `v.literal('x')`).
- **`v.instance(Class)`** tries `new Class()`; when the constructor requires arguments it falls back to `Object.create(Class.prototype)`, so methods relying on constructor state may not work.
- **`v.brand()` is an action in valibot 1.x**, not a schema wrapper. Branded pipe schemas are generated as their base type.

## Development

```bash
pnpm install
pnpm build          # rslib: ESM + CJS + .d.ts/.d.cts
pnpm test           # type-level tests + Node.js unit tests
pnpm test:types     # tsc --noEmit -p tsconfig.typetests.json
pnpm test:watch     # rstest --watch
pnpm coverage       # coverage report + thresholds
pnpm exec playwright install chromium
pnpm test:browser   # real-browser smoke tests (Rstest Browser Mode)
pnpm test:all       # Node.js tests + browser tests
# No Playwright download? Set PLAYWRIGHT_CHANNEL=msedge (or chrome)
# to reuse an installed browser.
pnpm check          # biome check (CI mode)
pnpm check:fix      # biome check --write
pnpm format         # biome format --write
```

The build targets `web` with ES2022 syntax, so the same output runs in browsers and Node.js. Source code must stay free of Node.js-only APIs; the `src/__tests__/browser.test.ts` suite runs in both Node.js and Chromium to catch regressions.

Coverage thresholds: statements 85%, lines 85%, functions 90%, branches 75%.

Release management uses [changesets](https://changesets.dev). Run `pnpm changeset` when preparing a change; CI publishes through GitHub Actions.

## License

[MIT](./LICENSE.txt) © jsdevlab
