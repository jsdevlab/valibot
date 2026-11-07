import { describe, expect, it } from '@rstest/core';
import * as v from 'valibot';

import { create, mock } from '../index';

const schemas: Record<string, v.GenericSchema> = {
  string: v.pipe(v.string(), v.minLength(3), v.maxLength(12)),
  email: v.pipe(v.string(), v.email()),
  url: v.pipe(v.string(), v.url()),
  uuid: v.pipe(v.string(), v.uuid()),
  number: v.pipe(v.number(), v.minValue(1), v.maxValue(100), v.integer()),
  bigint: v.bigint(),
  boolean: v.boolean(),
  date: v.date(),
  nan: v.nan(),
  symbol: v.symbol(),
  literal: v.literal('fixed'),
  enum: v.enum({ A: 'a', B: 'b' }),
  object: v.object({
    id: v.string(),
    role: v.enum({ Admin: 'admin', User: 'user' }),
  }),
  array: v.pipe(v.array(v.number()), v.minLength(1)),
  tuple: v.tuple([v.string(), v.number()]),
  record: v.record(v.string(), v.number()),
  map: v.map(v.string(), v.number()),
  set: v.set(v.number()),
  union: v.union([v.string(), v.number()]),
  variant: v.variant('t', [
    v.object({ t: v.literal('a'), v: v.string() }),
    v.object({ t: v.literal('b'), v: v.number() }),
  ]),
  intersect: v.intersect([
    v.object({ a: v.string() }),
    v.object({ b: v.number() }),
  ]),
  optional: v.optional(v.string()),
  nullable: v.nullable(v.string()),
  nullish: v.nullish(v.string()),
  undefinedable: v.undefinedable(v.string()),
  withDefault: v.optional(v.string(), 'd'),
  fallback: v.fallback(v.string(), 'f'),
  pipe: v.pipe(v.string(), v.length(3)),
  lazy: v.lazy(() => v.object({ self: v.string() })),
  blob: v.blob(),
  file: v.file(),
  instance: v.instance(Date),
  any: v.any(),
  unknown: v.unknown(),
  undefined_: v.undefined(),
  null_: v.null(),
  void_: v.void(),
  exactOptional: v.exactOptional(v.string()),
  nonNullable: v.nonNullable(v.nullable(v.string())),
  nonNullish: v.nonNullish(v.nullish(v.string())),
  nonOptional: v.nonOptional(v.optional(v.string())),
  picklist: v.picklist(['a', 'b', 'c']),
  looseObject: v.looseObject({ a: v.string() }),
  strictObject: v.strictObject({ a: v.string() }),
  objectWithRest: v.objectWithRest({ a: v.string() }, v.number()),
  looseTuple: v.looseTuple([v.string()]),
  strictTuple: v.strictTuple([v.string()]),
  tupleWithRest: v.tupleWithRest([v.string()], v.number()),
  decimal: v.pipe(v.string(), v.decimal()),
  slug: v.pipe(v.string(), v.slug()),
  nonEmpty: v.pipe(v.string(), v.nonEmpty()),
  brandAction: v.pipe(v.string(), v.brand('UserId')),
  isoDate: v.pipe(v.string(), v.isoDate()),
  isoTime: v.pipe(v.string(), v.isoTime()),
  isoTimeSecond: v.pipe(v.string(), v.isoTimeSecond()),
  isoTimestamp: v.pipe(v.string(), v.isoTimestamp()),
  isoWeek: v.pipe(v.string(), v.isoWeek()),
  cuid2: v.pipe(v.string(), v.cuid2()),
  bic: v.pipe(v.string(), v.bic()),
  creditCard: v.pipe(v.string(), v.creditCard()),
  hexColor: v.pipe(v.string(), v.hexColor()),
  imei: v.pipe(v.string(), v.imei()),
  isbn: v.pipe(v.string(), v.isbn()),
  isrc: v.pipe(v.string(), v.isrc()),
  jwsCompact: v.pipe(v.string(), v.jwsCompact()),
  ksuid: v.pipe(v.string(), v.ksuid()),
  hash: v.pipe(v.string(), v.hash(['md5', 'sha256'])),
};

// promise (async validation) is verified separately
const promised = v.promise() as unknown as v.GenericSchema;

describe('smoke: special types', () => {
  it('promise wraps a generated inner value (async validation)', async () => {
    const value = create(promised as unknown as v.GenericSchema);
    expect(value).toBeInstanceOf(Promise);
    const r = await v.safeParseAsync(promised as never, value as never);
    expect(r.success).toBe(true);
  });
});

describe('smoke: create', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    it(`create(${name}) parses`, () => {
      const value = create(schema);
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  }
});

describe('smoke: mock', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    it(`mock(${name}) parses`, () => {
      const value = mock(schema, { seed: 42 });
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  }
});
