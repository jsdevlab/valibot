import { describe, expect, it } from '@rstest/core';
import * as v from 'valibot';

import {
  create,
  mock,
  NoGeneratorException,
  RecursionLimitReachedException,
} from '../index';

describe('container constraints', () => {
  it('intersects array length constraints with the default options', () => {
    const schema = v.pipe(v.array(v.number()), v.minLength(3), v.maxLength(5));
    for (let seed = 0; seed < 20; seed++) {
      const value = mock(schema, { seed });
      expect(value.length).toBeGreaterThanOrEqual(3);
      expect(value.length).toBeLessThanOrEqual(5);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
    expect(create(schema)).toHaveLength(3);
  });

  it('honors record entry constraints in both modes', () => {
    const schema = v.pipe(
      v.record(v.string(), v.number()),
      v.minEntries(2),
      v.maxEntries(4),
    );
    expect(Object.keys(create(schema))).toHaveLength(2);
    for (let seed = 0; seed < 10; seed++) {
      const value = mock(schema, { seed });
      expect(Object.keys(value).length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(value).length).toBeLessThanOrEqual(4);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it('honors map/set size constraints', () => {
    const mapSchema = v.pipe(v.map(v.string(), v.number()), v.size(3));
    const setSchema = v.pipe(v.set(v.number()), v.minSize(2), v.maxSize(4));
    expect(create(mapSchema).size).toBe(3);
    expect(create(setSchema).size).toBe(2);
    for (let seed = 0; seed < 10; seed++) {
      const map = mock(mapSchema, { seed });
      expect(map.size).toBe(3);
      expect(v.safeParse(mapSchema, map).success).toBe(true);
      const set = mock(setSchema, { seed });
      expect(set.size).toBeGreaterThanOrEqual(2);
      expect(set.size).toBeLessThanOrEqual(4);
      expect(v.safeParse(setSchema, set).success).toBe(true);
    }
  });

  it('honors blob/file byte size constraints', () => {
    const blobSchema = v.pipe(v.blob(), v.size(4));
    const fileSchema = v.pipe(v.file(), v.minSize(2), v.maxSize(3));
    expect(create(blobSchema).size).toBe(4);
    expect(create(fileSchema).size).toBe(2);
    for (let seed = 0; seed < 10; seed++) {
      expect(mock(blobSchema, { seed }).size).toBe(4);
      const file = mock(fileSchema, { seed });
      expect(file.size).toBeGreaterThanOrEqual(2);
      expect(file.size).toBeLessThanOrEqual(3);
    }
  });
});

describe('number and bigint constraints', () => {
  it('clamps the init value into a negative-only range', () => {
    expect(create(v.pipe(v.number(), v.maxValue(-5)))).toBe(-5);
    expect(create(v.pipe(v.number(), v.ltValue(0)))).toBe(-1);
  });

  it('respects multipleOf in init and mock modes', () => {
    const schema = v.pipe(
      v.number(),
      v.multipleOf(7),
      v.minValue(5),
      v.maxValue(100),
    );
    const init = create(schema);
    expect(init % 7).toBe(0);
    expect(init).toBeGreaterThanOrEqual(5);
    for (let seed = 0; seed < 20; seed++) {
      const value = mock(schema, { seed });
      expect(value % 7).toBe(0);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it('supports fractional multiples that are representable in binary', () => {
    const schema = v.pipe(
      v.number(),
      v.multipleOf(0.5),
      v.minValue(1),
      v.maxValue(3),
    );
    for (let seed = 0; seed < 20; seed++) {
      const value = mock(schema, { seed });
      expect(value % 0.5).toBe(0);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it('honors exclusive gtValue/ltValue bounds', () => {
    const schema = v.pipe(v.number(), v.gtValue(5), v.ltValue(7), v.integer());
    for (let seed = 0; seed < 10; seed++) {
      expect(mock(schema, { seed })).toBe(6);
    }
    expect(create(schema)).toBe(6);
  });

  it('honors bigint min/max/multipleOf constraints', () => {
    const schema = v.pipe(
      v.bigint(),
      v.minValue(11n),
      v.maxValue(50n),
      v.multipleOf(5n),
    );
    expect(create(schema)).toBe(15n);
    for (let seed = 0; seed < 10; seed++) {
      const value = mock(schema, { seed });
      expect(value % 5n).toBe(0n);
      expect(value).toBeGreaterThanOrEqual(11n);
      expect(value).toBeLessThanOrEqual(50n);
    }
  });
});

describe('date constraints', () => {
  it('never generates outside a max-only constraint below the default minimum', () => {
    const max = new Date('2000-01-01T00:00:00Z');
    const schema = v.pipe(v.date(), v.maxValue(max));
    expect(create(schema).getTime()).toBeLessThanOrEqual(max.getTime());
    for (let seed = 0; seed < 10; seed++) {
      const value = mock(schema, { seed });
      expect(value.getTime()).toBeLessThanOrEqual(max.getTime());
      expect(v.safeParse(schema, value).success).toBe(true);
    }
    expect(create(v.pipe(v.date(), v.maxValue(new Date(0)))).getTime()).toBe(0);
  });

  it('honors minValue/maxValue in create and mock modes', () => {
    const min = new Date('2030-01-01T00:00:00Z');
    const max = new Date('2030-12-31T23:59:59Z');
    const schema = v.pipe(v.date(), v.minValue(min), v.maxValue(max));
    const init = create(schema);
    expect(init.getTime()).toBeGreaterThanOrEqual(min.getTime());
    expect(init.getTime()).toBeLessThanOrEqual(max.getTime());
    for (let seed = 0; seed < 20; seed++) {
      const value = mock(schema, { seed });
      expect(value.getTime()).toBeGreaterThanOrEqual(min.getTime());
      expect(value.getTime()).toBeLessThanOrEqual(max.getTime());
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });
});

describe('string constraints', () => {
  it('generates strings matching a regex', () => {
    const schema = v.pipe(v.string(), v.regex(/^[A-Z]{4}-\d{4}$/));
    for (let seed = 0; seed < 10; seed++) {
      const value = mock(schema, { seed });
      expect(value).toMatch(/^[A-Z]{4}-\d{4}$/);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it('validates ISO time/timestamp formats and Luhn-valid IMEI across seeds', () => {
    const schemas: Record<string, v.GenericSchema> = {
      isoTime: v.pipe(v.string(), v.isoTime()),
      isoTimeSecond: v.pipe(v.string(), v.isoTimeSecond()),
      isoTimestamp: v.pipe(v.string(), v.isoTimestamp()),
      imei: v.pipe(v.string(), v.imei()),
    };
    for (const [name, schema] of Object.entries(schemas)) {
      for (let seed = 0; seed < 20; seed++) {
        const value = mock(schema, { seed });
        expect(
          v.safeParse(schema, value).success,
          `${name} seed ${seed}: ${value}`,
        ).toBe(true);
      }
    }
  });

  it('generates escaped literal characters in regexes', () => {
    const schema = v.pipe(v.string(), v.regex(/^\d{2}\.\d{2}$/));
    for (let seed = 0; seed < 10; seed++) {
      const value = mock(schema, { seed });
      expect(value).toMatch(/^\d{2}\.\d{2}$/);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it('builds startsWith/endsWith/includes/excludes fragments', () => {
    const schema = v.pipe(
      v.string(),
      v.minLength(6),
      v.startsWith('AB'),
      v.endsWith('yz'),
      v.includes('cd'),
      v.excludes('QQ'),
    );
    for (let seed = 0; seed < 10; seed++) {
      const value = mock(schema, { seed });
      expect(value.startsWith('AB')).toBe(true);
      expect(value.endsWith('yz')).toBe(true);
      expect(value).toContain('cd');
      expect(value).not.toContain('QQ');
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it('respects nonEmpty and empty actions', () => {
    const nonEmpty = v.pipe(v.string(), v.nonEmpty());
    expect(create(nonEmpty)).toHaveLength(1);
    expect(mock(nonEmpty, { seed: 1 }).length).toBeGreaterThan(0);
    expect(create(v.pipe(v.string(), v.empty()))).toBe('');
  });

  it('uses the configured string length without violating maxLength', () => {
    const schema = v.pipe(v.string(), v.maxLength(50));
    expect(mock(schema, { seed: 1, string: { length: 10 } })).toHaveLength(10);
    const capped = v.pipe(v.string(), v.maxLength(8));
    expect(mock(capped, { seed: 1, string: { length: 20 } })).toHaveLength(8);
  });

  it('generates the declared hash digest lengths', () => {
    const md5 = v.pipe(v.string(), v.hash(['md5']));
    expect(mock(md5, { seed: 1 })).toHaveLength(32);
    const multi = v.pipe(v.string(), v.hash(['md5', 'sha256']));
    expect([32, 64]).toContain(mock(multi, { seed: 1 }).length);
    expect(v.safeParse(multi, mock(multi, { seed: 1 })).success).toBe(true);
  });
});

describe('defaults and merges', () => {
  it('allows null to override a generated value', () => {
    const schema = v.object({
      value: v.union([v.string(), v.null()]),
    });
    const value = create(schema, { defaults: { value: null } });
    expect(value.value).toBeNull();
  });

  it('replaces arrays instead of merging them as objects', () => {
    const schema = v.object({ tags: v.array(v.string()) });
    const value = create(schema, { defaults: { tags: ['a', 'b'] } });
    expect(value.tags).toEqual(['a', 'b']);
  });
});

describe('generator edge cases', () => {
  it('exports the exception classes as runtime values', () => {
    const bogus = { type: 'nope' } as unknown as v.GenericSchema;
    expect(() => mock(bogus)).toThrow(NoGeneratorException);

    const node: v.GenericSchema = v.lazy(() => node);
    expect(() => mock(node, { recursionLimit: 2 })).toThrow(
      RecursionLimitReachedException,
    );
  });

  it('rejects async lazy getters with a clear error', () => {
    const asyncLazy = v.lazy((async () =>
      v.string()) as unknown as () => v.GenericSchema);
    expect(() => mock(asyncLazy)).toThrow(/async getter/);
  });

  it('constructs class instances when possible and falls back to the prototype', () => {
    class Simple {
      readonly kind = 'simple';
    }
    class RequiresArgs {
      constructor(readonly id: number) {}
    }
    const simple = create(v.instance(Simple));
    expect(simple).toBeInstanceOf(Simple);
    expect(simple.kind).toBe('simple');
    const requiresArgs = create(v.instance(RequiresArgs));
    expect(requiresArgs).toBeInstanceOf(RequiresArgs);
  });

  it('treats the brand action as metadata and still generates the base schema', () => {
    const schema = v.pipe(v.string(), v.brand('UserId'));
    const value = mock(schema, { seed: 1 });
    expect(typeof value).toBe('string');
    expect(v.safeParse(schema, value).success).toBe(true);
  });
});
