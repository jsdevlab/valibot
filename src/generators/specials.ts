import type * as v from 'valibot';

import type { GenerationContext } from '../types';
import { lookupDefaults } from '../utils';

/**
 * Unstructured/special type generators:
 * - any/unknown: undefined in init; a random basic value in mock
 * - undefined/void: undefined; null: null; never: no value (handled by the unhandled strategy)
 * - custom: cannot be generated (user predicates are not introspectable) → defaults/unhandled strategy
 */

/**
 * Fall back to the caller-provided defaults, then the unhandled strategy.
 *
 * @param typeName - The schema type name (used in the error message)
 * @param ctx - The generation context
 * @returns The fallback value, or undefined in skip mode
 * @throws {Error} When no fallback is available and the unhandled strategy is 'throw'
 */
function unhandledFallback(typeName: string, ctx: GenerationContext): unknown {
  const fallback = lookupDefaults(ctx);
  if (fallback !== undefined) return fallback;
  if (ctx.options.unhandled === 'skip') return undefined;
  throw new Error(
    `${typeName} cannot be generated; provide a value via options.defaults, a custom generator, or set options.unhandled: 'skip'`,
  );
}

/**
 * Unstructured value generator: handles any/unknown/undefined/void/null/never.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated unstructured value
 * @throws {Error} When the schema cannot be handled (never) and the unhandled strategy is 'throw'
 */
export const anyGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => {
  if (schema.type === 'undefined' || schema.type === 'void') return undefined;
  if (schema.type === 'null') return null;
  if (schema.type === 'never') return unhandledFallback('never', ctx);
  if (ctx.mode === 'init') return undefined;
  return ctx.random.pick([0, '', false, null]);
};

/**
 * custom generator: user predicates are not introspectable, so generation falls back to the unhandled strategy.
 *
 * @param _schema - The valibot schema (unused by this generator)
 * @param ctx - The generation context
 * @returns A fallback value from defaults, or undefined in skip mode
 * @throws {Error} When no fallback is available and the unhandled strategy is 'throw'
 */
export const customGenerator = (
  _schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown => unhandledFallback('custom', ctx);
