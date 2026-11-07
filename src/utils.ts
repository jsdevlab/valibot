import type * as v from 'valibot';

import { isValid } from './constraints';
import type { GenerationContext } from './types';

/**
 * Generate candidates and validate them against the schema.
 * Retries up to `attempts` times so that hard constraints (regex, includes, ...) are honored.
 *
 * @param schema - The schema to validate against
 * @param generate - The candidate generation function
 * @param attempts - Maximum number of attempts (default 20)
 * @returns The first valid candidate, or the last generated candidate when none is valid
 */
export function tryValid(
  schema: v.GenericSchema,
  generate: () => unknown,
  attempts = 20,
): unknown {
  for (let i = 0; i < attempts; i++) {
    const value = generate();
    if (isValid(schema, value)) return value;
  }
  return generate();
}

/**
 * Look up a fallback value from the caller-provided defaults by the current field path.
 *
 * @param ctx - The generation context
 * @returns The fallback value, or undefined when none is found
 */
export function lookupDefaults(ctx: GenerationContext): unknown {
  let current: unknown = ctx.defaults;
  for (const key of ctx.path) {
    if (
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      Object.hasOwn(current, key)
    ) {
      current = (current as Record<string | number, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Read the inner schema of a wrapper schema.
 *
 * @param schema - The wrapper schema
 * @returns The wrapped schema
 */
export function wrappedOf(schema: v.GenericSchema): v.GenericSchema {
  return (schema as unknown as { wrapped: v.GenericSchema }).wrapped;
}

/**
 * Read the entries of an object-like schema.
 *
 * @param schema - The object-like schema
 * @returns The schema entries (an empty record when there are none)
 */
export function entriesOf(
  schema: v.GenericSchema,
): Record<string, v.GenericSchema> {
  return (
    (schema as { entries?: Record<string, v.GenericSchema> }).entries ?? {}
  );
}

/**
 * Read the fixed items of a tuple-like schema.
 *
 * @param schema - The tuple-like schema
 * @returns The item schemas (an empty array when there are none)
 */
export function itemsOf(schema: v.GenericSchema): v.GenericSchema[] {
  return (schema as { items?: v.GenericSchema[] }).items ?? [];
}

/**
 * Read the branches of a union/variant/intersect schema.
 *
 * @param schema - The composite schema
 * @returns The branch schemas (an empty array when there are none)
 */
export function optionsOf(schema: v.GenericSchema): v.GenericSchema[] {
  return (schema as { options?: v.GenericSchema[] }).options ?? [];
}

/**
 * Whether a value is a plain object (not an array, Map, Set, Date, class instance, ...).
 *
 * @param value - The value to check
 * @returns True for plain objects
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
