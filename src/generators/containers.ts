import type * as v from 'valibot';

import {
  arrayConstraints,
  baseOf,
  type SizeConstraints,
  sizeConstraints,
} from '../constraints';
import { generate } from '../generate';
import type { GenerationContext, SizeOptions } from '../types';

const CONTENT_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Read an inner schema (item/key/value) from the base schema.
 *
 * @param schema - The container schema
 * @param key - The property name holding the inner schema
 * @returns The inner schema
 */
function innerSchema(schema: v.GenericSchema, key: string): v.GenericSchema {
  return (schema as unknown as Record<string, v.GenericSchema>)[key];
}

/**
 * Resolve the effective container size from schema constraints and caller options.
 *
 * @param ctx - The generation context
 * @param constraints - The schema size constraints
 * @param options - The caller-provided size options
 * @param defaultMax - The default maximum size
 * @returns The number of items/entries to generate
 */
function resolveCount(
  ctx: GenerationContext,
  constraints: SizeConstraints,
  options: SizeOptions | undefined,
  defaultMax: number,
): number {
  if (constraints.exact !== undefined) return constraints.exact;
  const min = Math.max(constraints.min ?? 0, options?.min ?? 0);
  let max = Math.min(
    constraints.max ?? Number.POSITIVE_INFINITY,
    options?.max ?? defaultMax,
  );
  if (max < min) max = min;
  return ctx.mode === 'init' ? min : ctx.random.int(min, max);
}

/**
 * Number of key-generation attempts allowed to reach the requested unique count.
 *
 * @param count - The requested size
 * @returns The attempt budget
 */
function attemptBudget(count: number): number {
  return count * 10 + 10;
}

/**
 * Run a generator under a temporary mode.
 * Used to obtain distinct members for unique containers in init mode, where the
 * regular init values (empty string, 0, ...) would otherwise collapse into one entry.
 *
 * @param ctx - The generation context
 * @param mode - The temporary mode
 * @param fn - The generation function
 * @returns The generated value
 */
function withMode<T>(
  ctx: GenerationContext,
  mode: GenerationContext['mode'],
  fn: () => T,
): T {
  const previous = ctx.mode;
  ctx.mode = mode;
  try {
    return fn();
  } finally {
    ctx.mode = previous;
  }
}

/**
 * Array generator: the minimum length in init mode; a random length within
 * schema constraints and caller options in mock mode.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns An array of generated items
 */
export const arrayGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown[] => {
  const item = innerSchema(baseOf(schema), 'item');
  const constraints = arrayConstraints(schema);
  const min = Math.max(constraints.minLength ?? 0, ctx.options.array.min ?? 0);
  let max = Math.min(
    constraints.maxLength ?? Number.POSITIVE_INFINITY,
    ctx.options.array.max ?? 10,
  );
  if (max < min) max = min;
  const length = ctx.mode === 'init' ? min : ctx.random.int(min, max);
  return Array.from({ length }, () => generate(item, ctx));
};

/**
 * Tuple generator: generates each item in order.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns An array of generated items
 */
export const tupleGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown[] => {
  const items = (schema as { items?: v.GenericSchema[] }).items ?? [];
  return items.map((item) => generate(item, ctx));
};

/**
 * Record generator: respects `minEntries`/`maxEntries`; generates unique keys.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A record of generated key-value entries
 */
export const recordGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Record<string, unknown> => {
  const base = baseOf(schema);
  const key = innerSchema(base, 'key');
  const value = innerSchema(base, 'value');
  const count = resolveCount(
    ctx,
    sizeConstraints(schema),
    ctx.options.record,
    10,
  );
  const out: Record<string, unknown> = {};
  const distinct = ctx.mode === 'init' && count > 1;
  let attempts = 0;
  while (Object.keys(out).length < count && attempts++ < attemptBudget(count)) {
    const nextKey = distinct
      ? withMode(ctx, 'mock', () => generate(key, ctx))
      : generate(key, ctx);
    out[String(nextKey)] = generate(value, ctx);
  }
  return out;
};

/**
 * Map generator: respects `minSize`/`maxSize`/`size`; generates unique keys.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A map of generated key-value entries
 */
export const mapGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Map<unknown, unknown> => {
  const base = baseOf(schema);
  const key = innerSchema(base, 'key');
  const value = innerSchema(base, 'value');
  const count = resolveCount(ctx, sizeConstraints(schema), ctx.options.map, 10);
  const out = new Map<unknown, unknown>();
  const distinct = ctx.mode === 'init' && count > 1;
  let attempts = 0;
  while (out.size < count && attempts++ < attemptBudget(count)) {
    const nextKey = distinct
      ? withMode(ctx, 'mock', () => generate(key, ctx))
      : generate(key, ctx);
    out.set(nextKey, generate(value, ctx));
  }
  return out;
};

/**
 * Set generator: respects `minSize`/`maxSize`/`size`; generates unique entries.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A set of generated entries
 */
export const setGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Set<unknown> => {
  const value = innerSchema(baseOf(schema), 'value');
  const count = resolveCount(ctx, sizeConstraints(schema), ctx.options.set, 10);
  const out = new Set<unknown>();
  const distinct = ctx.mode === 'init' && count > 1;
  let attempts = 0;
  while (out.size < count && attempts++ < attemptBudget(count)) {
    out.add(
      distinct
        ? withMode(ctx, 'mock', () => generate(value, ctx))
        : generate(value, ctx),
    );
  }
  return out;
};

/**
 * Generate blob/file content honoring the schema size constraints.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns The content string
 */
function contentOf(schema: v.GenericSchema, ctx: GenerationContext): string {
  const count = resolveCount(ctx, sizeConstraints(schema), undefined, 20);
  return ctx.mode === 'init'
    ? 'a'.repeat(count)
    : ctx.random.string(count, CONTENT_CHARSET);
}

/**
 * Blob generator: an empty (or minimum-size) blob in init mode; a random text
 * blob in mock mode.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated Blob
 */
export const blobGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Blob => new Blob([contentOf(schema, ctx)], { type: 'text/plain' });

/**
 * File generator: an empty (or minimum-size) file in init mode; a random text
 * file in mock mode.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated File
 */
export const fileGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): File =>
  new File([contentOf(schema, ctx)], 'mock.txt', { type: 'text/plain' });
