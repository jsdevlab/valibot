import { describe, expect, it } from '@rstest/core';
import * as v from 'valibot';

import { create, mock } from '../index';

// This file runs in both Node.js (main rstest config) and a real browser
// (rstest.browser.config.ts). It verifies that the library only relies on
// universal runtime APIs: Blob, File, btoa, Promise, Symbol and BigInt.
describe('universal runtime', () => {
  const schema = v.object({
    id: v.pipe(v.string(), v.uuid()),
    email: v.pipe(v.string(), v.email()),
    tags: v.pipe(v.array(v.string()), v.minLength(1)),
    blob: v.blob(),
    file: v.file(),
    createdAt: v.date(),
  });

  it('exposes the required web globals', () => {
    expect(typeof Blob).toBe('function');
    expect(typeof File).toBe('function');
    expect(typeof btoa).toBe('function');
  });

  it('generates valid initialization data', () => {
    const init = create(schema);
    expect(v.safeParse(schema, init).success).toBe(true);
    expect(init.blob).toBeInstanceOf(Blob);
    expect(init.file).toBeInstanceOf(File);
  });

  it('generates valid, reproducible mock data', () => {
    for (const seed of [0, 1, 42]) {
      const value = mock(schema, { seed });
      expect(v.safeParse(schema, value).success).toBe(true);
      expect(value.blob).toBeInstanceOf(Blob);
      expect(value.file).toBeInstanceOf(File);
    }
    const sample = v.object({
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    });
    expect(mock(sample, { seed: 7 })).toEqual(mock(sample, { seed: 7 }));
    expect(create(sample)).toEqual(create(sample));
  });

  it('formats base64 without Node.js APIs', () => {
    const base64 = mock(v.pipe(v.string(), v.base64()), { seed: 3 });
    expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(v.safeParse(v.pipe(v.string(), v.base64()), base64).success).toBe(
      true,
    );
  });
});
