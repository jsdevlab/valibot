import type * as v from 'valibot';

import { generate } from '../generate';
import type { GenerationContext } from '../types';
import { optionsOf } from '../utils';

/**
 * Union generator: first branch in init; random branch in mock.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching one of the union branches
 */
export const unionGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  const options = optionsOf(schema);
  const branch = ctx.mode === 'init' ? options[0] : ctx.random.pick(options);
  return generate(branch, ctx);
};

/**
 * Variant generator: picks a branch at random (by discriminator).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching one of the variant branches
 */
export const variantGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  const options = optionsOf(schema);
  const branch = ctx.mode === 'init' ? options[0] : ctx.random.pick(options);
  return generate(branch, ctx);
};

/**
 * Intersect generator: merges both sides' generated values (right side overrides conflicting keys); non-objects take the left side.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching the intersection type
 */
export const intersectGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  const options = optionsOf(schema);
  const [left, right] = options;
  const leftValue = generate(left, ctx);
  if (options.length < 2) return leftValue;
  const rightValue = generate(right, ctx);
  if (
    leftValue !== null &&
    typeof leftValue === 'object' &&
    !Array.isArray(leftValue) &&
    rightValue !== null &&
    typeof rightValue === 'object' &&
    !Array.isArray(rightValue)
  ) {
    return { ...(leftValue as object), ...(rightValue as object) };
  }
  return leftValue;
};

/**
 * Lazy generator: getter(undefined) yields the inner schema (recursion depth is checked by generate).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A value matching the inner (lazily resolved) schema
 * @throws {Error} When the lazy getter returns a Promise/thenable (async getters are not supported by sync mock)
 */
export const lazyGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  const getter = (
    schema as unknown as { getter: (input: unknown) => v.GenericSchema }
  ).getter;
  const inner = getter(undefined);
  if (
    inner !== null &&
    typeof inner === 'object' &&
    typeof (inner as { then?: unknown }).then === 'function'
  ) {
    throw new Error('lazy: async getter is not supported by sync mock');
  }
  return generate(inner, ctx);
};
