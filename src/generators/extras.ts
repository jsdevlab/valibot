import * as v from 'valibot';

import { generate } from '../generate';
import type { GenerationContext } from '../types';
import { entriesOf, itemsOf, lookupDefaults, wrappedOf } from '../utils';

/**
 * Generators for valibot supplementary types:
 * - exact_optional / non_nullable / non_nullish / non_optional: strip the wrapper
 * - picklist: random/first option from the options array
 * - loose_object / strict_object / object_with_rest: entries + rest
 * - loose_tuple / strict_tuple / tuple_with_rest: items + rest
 * - promise: Promise.resolve(undefined)
 * - function: cannot be generated → unhandled strategy
 */

/**
 * Strip the wrapper: peel nullable/nullish/optional one more layer (non_xxx semantics).
 *
 * @param schema - The schema to unwrap
 * @returns The innermost non-wrapper schema
 */
function unwrap(schema: v.GenericSchema): v.GenericSchema {
  let inner = wrappedOf(schema);
  while (
    inner.type === 'nullable' ||
    inner.type === 'nullish' ||
    inner.type === 'optional'
  ) {
    inner = wrappedOf(inner);
  }
  return inner;
}

/**
 * exactOptional: the key may be missing but an explicit undefined is invalid → generate the inner value directly.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching the inner (wrapped) schema
 */
export const exactOptionalGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => generate(wrappedOf(schema), ctx);

/**
 * non_nullable generator: strips the nullable wrapper and generates the inner value.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching the inner (unwrapped) schema
 */
export const nonNullableGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => generate(unwrap(schema), ctx);

/**
 * non_nullish generator: strips the nullish wrapper and generates the inner value.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching the inner (unwrapped) schema
 */
export const nonNullishGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => generate(unwrap(schema), ctx);

/**
 * non_optional generator: strips the optional wrapper and generates the inner value.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching the inner (unwrapped) schema
 */
export const nonOptionalGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => generate(unwrap(schema), ctx);

/**
 * picklist: random pick from the options array (first in init).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns One of the picklist options
 */
export const picklistGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  const options = (schema as { options?: unknown[] }).options ?? [];
  return ctx.mode === 'init' ? options[0] : ctx.random.pick(options);
};

/**
 * Generate all declared object entries (field names are pushed onto path for defaults fallback lookup).
 *
 * @param schema - The object-like schema
 * @param ctx - The generation context
 * @returns A record of generated entries
 */
function generateEntries(
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(entriesOf(schema))) {
    ctx.path.push(key);
    out[key] = generate(field, ctx);
    ctx.path.pop();
  }
  return out;
}

/**
 * loose_object: entries + one extra random key in mock mode (loose allows extra keys).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A record of generated entries
 */
export const looseObjectGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Record<string, unknown> => {
  const out = generateEntries(schema, ctx);
  if (ctx.mode === 'mock') {
    out[`extra_${ctx.random.int(1, 999)}`] = generate(
      (schema as { rest?: v.GenericSchema }).rest ?? v.string(),
      ctx,
    );
  }
  return out;
};

/**
 * strict_object: same as object (strict rejects extra keys, generating entries is enough).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A record of generated entries
 */
export const strictObjectGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Record<string, unknown> => generateEntries(schema, ctx);

/**
 * object_with_rest: entries + rest key-values in mock mode.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A record of generated entries including rest keys
 */
export const objectWithRestGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Record<string, unknown> => {
  const out = generateEntries(schema, ctx);
  if (ctx.mode === 'mock') {
    out[`rest_${ctx.random.int(1, 999)}`] = generate(
      (schema as { rest?: v.GenericSchema }).rest ?? v.string(),
      ctx,
    );
  }
  return out;
};

/**
 * Generate tuple items plus an optional number of rest items in mock mode.
 *
 * @param schema - The tuple-like schema
 * @param ctx - The generation context
 * @returns An array of generated items
 */
function generateTupleWithRest(
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown[] {
  const out = itemsOf(schema).map((item) => generate(item, ctx));
  if (ctx.mode === 'mock') {
    const rest = (schema as { rest?: v.GenericSchema }).rest;
    if (rest) {
      for (let i = 0; i < ctx.random.int(0, 2); i++) {
        out.push(generate(rest, ctx));
      }
    }
  }
  return out;
}

/**
 * loose tuple: generate items (rest appended at random in mock mode).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns An array of generated items
 */
export const looseTupleGenerator = generateTupleWithRest;

/**
 * strict tuple: generate items without rest.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns An array of generated items
 */
export const strictTupleGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown[] => itemsOf(schema).map((item) => generate(item, ctx));

/**
 * tuple_with_rest: generate items (rest appended at random in mock mode).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns An array of generated items
 */
export const tupleWithRestGenerator = generateTupleWithRest;

/**
 * promise: the value must be a Promise instance (no inner schema) → Promise.resolve(undefined).
 *
 * @returns A promise resolving to undefined
 */
export const promiseGenerator = (): Promise<unknown> =>
  Promise.resolve(undefined);

/**
 * function: the function body cannot be generated; handle via the unhandled strategy.
 *
 * @param _schema - The valibot schema (unused by this generator)
 * @param ctx - The generation context
 * @returns A fallback value from defaults, or undefined in skip mode
 * @throws {Error} When no fallback is available and the unhandled strategy is 'throw'
 */
export const functionGenerator = (
  _schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  const fallback = lookupDefaults(ctx);
  if (fallback !== undefined) return fallback;
  if (ctx.options.unhandled === 'skip') return undefined;
  throw new Error(
    `function cannot be generated; provide a value via options.defaults, a custom generator, or set options.unhandled: 'skip'`,
  );
};
