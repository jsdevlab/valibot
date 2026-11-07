// Type-level tests: create/mock return v.InferOutput<T> and follow the schema.
// Checked with `tsc --noEmit -p tsconfig.typetests.json` (part of `pnpm test`).

import * as v from 'valibot';

import {
  create,
  mock,
  NoGeneratorException,
  RecursionLimitReachedException,
} from '../src/index';

const userSchema = v.object({
  id: v.string(),
  name: v.string(),
  role: v.enum({ Admin: 'admin', User: 'user' }),
  page: v.optional(v.number(), 1),
  tags: v.array(v.string()),
});

// Positive: the return type equals v.InferOutput<T>
const init = create(userSchema);
const _init: {
  id: string;
  name: string;
  role: 'admin' | 'user';
  page: number;
  tags: string[];
} = init;

const mockValue = mock(userSchema, { seed: 1 });
const _mockVal: typeof init = mockValue;

// Negative: field types are inferred correctly
// @ts-expect-error `name` is a string
const _bad: number = init.name;

// Complex types: union / variant / tuple / map / set / lazy
const complex = v.object({
  u: v.union([v.string(), v.number()]),
  vr: v.variant('t', [
    v.object({ t: v.literal('a'), v: v.string() }),
    v.object({ t: v.literal('b'), v: v.number() }),
  ]),
  tuple: v.tuple([v.string(), v.number()]),
  map: v.map(v.string(), v.number()),
  set: v.set(v.number()),
  date: v.date(),
  lazy: v.lazy(() => v.object({ self: v.number() })),
});
const initComplex = create(complex);
const _ic: {
  u: string | number;
  vr: { t: 'a'; v: string } | { t: 'b'; v: number };
  tuple: [string, number];
  map: Map<string, number>;
  set: Set<number>;
  date: Date;
  lazy: { self: number };
} = initComplex;

const mockComplex = mock(complex);
const _mc: typeof initComplex = mockComplex;

// defaults: checked at compile time as DeepPartial<v.InferOutput<T>>
const withDefaults = create(userSchema, {
  defaults: { name: 'Alice', role: 'admin', page: 2 },
});
const _wd: typeof init = withDefaults;
// @ts-expect-error `nope` is not a schema field
create(userSchema, { defaults: { nope: 1 } });
// @ts-expect-error `page` must be a number
create(userSchema, { defaults: { page: 'x' } });
// @ts-expect-error `role` must be an enum value
mock(userSchema, { defaults: { role: 'superadmin' } });

// DeepPartial: nested objects can be overridden partially
import type { DeepPartial, GenerateOptions } from '../src/index';

const _dp: DeepPartial<{ a: { b: string; c: number }; list: string[] }> = {
  a: { b: 'x' },
  list: ['y'],
};
// @ts-expect-error field type mismatch
const _badDp: DeepPartial<{ a: number }> = { a: 'x' };
void _dp;
void _badDp;

// Options are type-checked
const options: GenerateOptions<typeof userSchema> = {
  seed: 42,
  recursionLimit: 5,
  useDefault: true,
  useFallback: true,
  unhandled: 'skip',
  array: { min: 1, max: 3 },
  optional: { chance: 0.5 },
  date: { min: new Date(0) },
  string: { length: [3, 10] },
};
void options;
// @ts-expect-error `unhandled` only accepts 'throw' | 'skip'
mock(userSchema, { unhandled: 'ignore' });

// Custom generators are typed and can match by instance or type
mock(userSchema, {
  generators: [
    { type: 'string', generator: () => 'fixed' },
    { schema: userSchema, generator: () => ({}) },
  ],
});

// Exception classes are exported as runtime values
const _noGenerator: Error = new NoGeneratorException('unknown');
const _recursion: Error = new RecursionLimitReachedException(10);
void _noGenerator;
void _recursion;
