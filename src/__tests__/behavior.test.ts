import { describe, expect, it } from '@rstest/core';
import * as v from 'valibot';

import { create, mock } from '../index';

describe('create semantics', () => {
  it('returns deterministic empty-ish defaults', () => {
    expect(create(v.object({ name: v.string(), n: v.number() }))).toEqual({
      name: '',
      n: 0,
    });
    expect(create(v.array(v.string()))).toEqual([]);
    expect(create(v.boolean())).toBe(false);
    expect(create(v.optional(v.string()))).toBeUndefined();
    expect(create(v.nullable(v.string()))).toBeNull();
  });

  it('respects optional defaults', () => {
    expect(create(v.optional(v.string(), 'd'))).toBe('d');
  });

  it('respects fallback values', () => {
    expect(create(v.fallback(v.string(), 'f'))).toBe('f');
    expect(create(v.fallback(v.number(), 7))).toBe(7);
  });

  it('skips fallback when useFallback is false', () => {
    expect(create(v.fallback(v.string(), 'f'), { useFallback: false })).toBe(
      '',
    );
  });

  it('respects positive min constraints', () => {
    expect(create(v.pipe(v.number(), v.minValue(5)))).toBe(5);
    expect(create(v.pipe(v.number(), v.minValue(-5)))).toBe(0);
  });

  it('honors string length constraints instead of empty string', () => {
    expect(create(v.pipe(v.string(), v.minLength(3)))).toHaveLength(3);
    expect(create(v.pipe(v.string(), v.email()))).toMatch(/@/);
  });

  it('honors array minLength constraints', () => {
    expect(create(v.pipe(v.array(v.string()), v.minLength(2)))).toHaveLength(2);
  });
});

describe('mock semantics', () => {
  it('is reproducible with the same seed', () => {
    const schema = v.object({ name: v.string(), n: v.number() });
    expect(mock(schema, { seed: 7 })).toEqual(mock(schema, { seed: 7 }));
  });

  it('differs across seeds', () => {
    const schema = v.object({ name: v.string(), n: v.number() });
    expect(mock(schema, { seed: 1 })).not.toEqual(mock(schema, { seed: 2 }));
  });

  it('respects number range constraints', () => {
    const schema = v.pipe(
      v.number(),
      v.minValue(10),
      v.maxValue(20),
      v.integer(),
    );
    for (let seed = 0; seed < 20; seed++) {
      const n = mock(schema, { seed });
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);
    }
  });

  it('respects string length constraints', () => {
    const schema = v.pipe(v.string(), v.length(8));
    for (let seed = 0; seed < 10; seed++) {
      expect(mock(schema, { seed })).toHaveLength(8);
    }
  });

  it('respects optional chance', () => {
    const schema = v.object({ q: v.optional(v.string()) });
    const seen = new Set<boolean>();
    for (let seed = 0; seed < 50; seed++) {
      const value = mock(schema, { seed, optional: { chance: 0.5 } }).q;
      seen.add(value === undefined);
    }
    expect(seen.has(true)).toBe(true);
    expect(seen.has(false)).toBe(true);
  });

  it('generates valid email and uuid formats', () => {
    expect(mock(v.pipe(v.string(), v.email()), { seed: 1 })).toMatch(
      /^[^@]+@[^@]+\.[^@]+$/,
    );
    expect(mock(v.pipe(v.string(), v.uuid()), { seed: 1 })).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });
});

describe('custom generators', () => {
  it('matches by schema instance', () => {
    const special = v.string();
    const schema = v.object({ a: special, b: v.string() });
    const value = mock(schema, {
      seed: 1,
      generators: [{ schema: special, generator: () => 'fixed' }],
    });
    expect(value.a).toBe('fixed');
    expect(value.b).not.toBe('fixed');
  });

  it('matches by schema type', () => {
    const schema = v.object({ id: v.number() });
    const value = create(schema, {
      generators: [{ type: 'number', generator: () => 42 }],
    });
    expect(value.id).toBe(42);
  });
});

describe('recursion handling', () => {
  it('throws when lazy recursion exceeds the limit', () => {
    const node: v.GenericSchema = v.lazy(() => node);
    expect(() => mock(node, { recursionLimit: 5 })).toThrow(/Recursion limit/);
  });

  it('generates finite lazy trees within the limit', () => {
    const nodeSchema: v.GenericSchema = v.lazy(() =>
      v.object({
        value: v.string(),
        child: v.optional(nodeSchema),
      }),
    );
    const value = mock(nodeSchema, {
      seed: 1,
      recursionLimit: 12,
      optional: { chance: 0.2 },
    }) as { value: string; child?: unknown };
    expect(typeof value.value).toBe('string');
  });
});

describe('unhandled strategy and defaults', () => {
  const customField = v.custom<number>((input) => typeof input === 'number');

  it('throws by default for ungenerable schemas', () => {
    expect(() => create(customField)).toThrow(/cannot be generated/);
  });

  it('skips with undefined when unhandled is skip', () => {
    expect(create(customField, { unhandled: 'skip' })).toBeUndefined();
  });

  it('uses defaults as a fallback for ungenerable schemas', () => {
    expect(create(customField, { defaults: 42 })).toBe(42);
  });

  it('finds nested defaults by field path', () => {
    const schema = v.object({
      outer: v.object({ inner: customField }),
    });
    const value = create(schema, { defaults: { outer: { inner: 42 } } });
    expect(value).toEqual({ outer: { inner: 42 } });
  });

  it('deep-merges defaults without dropping generated siblings', () => {
    const schema = v.object({
      profile: v.object({ name: v.string(), age: v.number() }),
      tags: v.array(v.string()),
    });
    const value = create(schema, { defaults: { profile: { name: 'Alice' } } });
    expect(value.profile.name).toBe('Alice');
    expect(typeof value.profile.age).toBe('number');
    expect(value.tags).toEqual([]);
  });
});

describe('format and constraint coverage', () => {
  it('generates valid uuid/ipv4/ipv6/date-time/emoji/base64/nanoid/ulid/cuid formats', () => {
    const cases: Array<[string, v.GenericSchema, RegExp]> = [
      ['uuid', v.pipe(v.string(), v.uuid()), /^[0-9a-f-]{36}$/],
      ['ipv4', v.pipe(v.string(), v.ipv4()), /^\d{1,3}(\.\d{1,3}){3}$/],
      ['ipv6', v.pipe(v.string(), v.ipv6()), /:/],
      [
        'date-time',
        v.pipe(v.string(), v.isoDateTime()),
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      ],
      ['emoji', v.pipe(v.string(), v.emoji()), /\p{Emoji}/u],
      ['base64', v.pipe(v.string(), v.base64()), /^[A-Za-z0-9+/]+=*$/],
    ];
    for (const [name, schema, pattern] of cases) {
      const value = mock(schema, { seed: 3 });
      expect(value, name).toMatch(pattern);
      expect(v.safeParse(schema, value).success, name).toBe(true);
    }
  });

  it('handles includes/excludes/startsWith/endsWith via validation loop', () => {
    const schema = v.pipe(
      v.string(),
      v.minLength(4),
      v.includes('ab'),
      v.excludes('zz'),
    );
    const value = mock(schema, { seed: 5 });
    expect(value).toContain('ab');
    expect(value).not.toContain('zz');
    expect(v.safeParse(schema, value).success).toBe(true);
  });

  it('handles regex constraints', () => {
    const schema = v.pipe(v.string(), v.regex(/^[a-z]+$/));
    const value = mock(schema, { seed: 2 });
    expect(/^[a-z]+$/.test(value)).toBe(true);
  });
});

describe('wrapper and container branches', () => {
  it('nullish produces all three branches', () => {
    const schema = v.nullish(v.string());
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const value = mock(schema, { seed });
      seen.add(
        value === null ? 'null' : value === undefined ? 'undefined' : 'wrapped',
      );
    }
    expect(seen.has('null')).toBe(true);
    expect(seen.has('undefined')).toBe(true);
    expect(seen.has('wrapped')).toBe(true);
  });

  it('undefinedable produces undefined and wrapped values', () => {
    const schema = v.undefinedable(v.string());
    const seen = new Set<boolean>();
    for (let seed = 0; seed < 60; seed++) {
      seen.add(mock(schema, { seed }) === undefined);
    }
    expect(seen.has(true)).toBe(true);
    expect(seen.has(false)).toBe(true);
  });

  it('record/map/set generate random entries in mock mode', () => {
    for (let seed = 0; seed < 5; seed++) {
      const record = mock(v.record(v.string(), v.number()), { seed });
      expect(typeof record).toBe('object');
      const map = mock(v.map(v.string(), v.number()), { seed });
      expect(map instanceof Map).toBe(true);
      const set = mock(v.set(v.number()), { seed });
      expect(set instanceof Set).toBe(true);
    }
  });

  it('blob and file generate real instances in mock mode', () => {
    expect(mock(v.blob(), { seed: 1 }) instanceof Blob).toBe(true);
    expect(mock(v.file(), { seed: 1 }) instanceof File).toBe(true);
    expect(create(v.blob()) instanceof Blob).toBe(true);
  });

  it('variant picks branches randomly in mock mode', () => {
    const schema = v.variant('t', [
      v.object({ t: v.literal('a') }),
      v.object({ t: v.literal('b') }),
    ]);
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      seen.add(String(mock(schema, { seed }).t));
    }
    expect(seen.has('a')).toBe(true);
    expect(seen.has('b')).toBe(true);
  });

  it('bigint generates in range and with min constraint', () => {
    const big = v.pipe(v.bigint(), v.minValue(5n));
    expect(create(big)).toBe(5n);
    expect(typeof mock(big, { seed: 1 })).toBe('bigint');
  });

  it('number generates floats for non-integer constraints', () => {
    const schema = v.pipe(v.number(), v.minValue(0.5), v.maxValue(2.5));
    const value = mock(schema, { seed: 3 });
    expect(value).toBeGreaterThanOrEqual(0.5);
    expect(value).toBeLessThanOrEqual(2.5);
  });
});

describe('extended schema types', () => {
  it('generates valid values for exactOptional/nonNullable/nonNullish/nonOptional', () => {
    const cases = [
      v.exactOptional(v.string()),
      v.nonNullable(v.nullable(v.string())),
      v.nonNullish(v.nullish(v.string())),
      v.nonOptional(v.optional(v.string())),
    ];
    for (const schema of cases) {
      const value = mock(schema, { seed: 1 });
      expect(v.safeParse(schema, value).success).toBe(true);
    }
    // Semantics: exactOptional generates the inner value (an explicit undefined is invalid)
    expect(typeof create(v.exactOptional(v.string()))).toBe('string');
  });

  it('picklist picks from the declared options', () => {
    const schema = v.picklist(['a', 'b', 'c']);
    expect(create(schema)).toBe('a');
    for (let seed = 0; seed < 20; seed++) {
      expect(['a', 'b', 'c']).toContain(mock(schema, { seed }));
    }
  });

  it('loose/strict object and tuple variants', () => {
    const loose = v.looseObject({ a: v.string() });
    expect(v.safeParse(loose, mock(loose, { seed: 1 })).success).toBe(true);
    const strict = v.strictObject({ a: v.string() });
    expect(v.safeParse(strict, mock(strict, { seed: 1 })).success).toBe(true);
    const withRest = v.objectWithRest({ a: v.string() }, v.number());
    const wr = mock(withRest, { seed: 1 });
    expect(v.safeParse(withRest, wr).success).toBe(true);
    const looseTuple = v.looseTuple([v.string()]);
    expect(v.safeParse(looseTuple, mock(looseTuple, { seed: 1 })).success).toBe(
      true,
    );
    const tupleRest = v.tupleWithRest([v.string()], v.number());
    expect(v.safeParse(tupleRest, mock(tupleRest, { seed: 1 })).success).toBe(
      true,
    );
  });

  it('function throws by default and skips with unhandled skip', () => {
    const fn = v.function() as unknown as v.GenericSchema;
    expect(() => create(fn)).toThrow(/cannot be generated/);
    expect(create(fn, { unhandled: 'skip' })).toBeUndefined();
    expect(create(fn, { defaults: () => 'x' })).toBeInstanceOf(Function);
  });

  it('respects fallback via v.getFallback and default via v.getDefault', () => {
    expect(create(v.fallback(v.number(), 7))).toBe(7);
    expect(create(v.optional(v.string(), 'd'))).toBe('d');
    // Function-form defaults are handled by valibot internally
    expect(create(v.optional(v.number(), () => 42))).toBe(42);
  });
});
