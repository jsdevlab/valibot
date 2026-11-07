import type * as v from 'valibot';

import { generate } from '../generate';
import type { GenerationContext } from '../types';
import { wrappedOf } from '../utils';

/**
 * Optional generator: undefined in init; generates the inner value with a probability in mock
 * (default values are handled at the generate entry).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns undefined or a value matching the inner (wrapped) schema
 */
export const optionalGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  if (ctx.mode === 'init') return undefined;
  if (ctx.random.chance(ctx.options.optional.chance ?? 0.3)) return undefined;
  return generate(wrappedOf(schema), ctx);
};

/**
 * Nullable generator: null in init; generates the inner value with a probability in mock.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns null or a value matching the inner (wrapped) schema
 */
export const nullableGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  if (ctx.mode === 'init') return null;
  if (ctx.random.chance(ctx.options.nullable.chance ?? 0.3)) return null;
  return generate(wrappedOf(schema), ctx);
};

/**
 * Nullish generator: null in init; three branches in mock (inner/null/undefined).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns null, undefined, or a value matching the inner (wrapped) schema
 */
export const nullishGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  if (ctx.mode === 'init') return null;
  const branch = ctx.random.pick(['wrapped', 'null', 'undefined'] as const);
  if (branch === 'wrapped') return generate(wrappedOf(schema), ctx);
  return branch === 'null' ? null : undefined;
};

/**
 * Undefinedable generator: undefined in init; generates the inner value with a probability in mock.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns undefined or a value matching the inner (wrapped) schema
 */
export const undefinedableGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  if (ctx.mode === 'init') return undefined;
  if (ctx.random.chance(ctx.options.optional.chance ?? 0.3)) return undefined;
  return generate(wrappedOf(schema), ctx);
};
