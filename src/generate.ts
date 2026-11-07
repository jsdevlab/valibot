import * as v from 'valibot';
import type { GenerationContext, GeneratorDefinition } from './types';
import { NoGeneratorException, RecursionLimitReachedException } from './types';

/**
 * Main generation loop:
 * 1. fallback wrapper (schema.fallback present) → fallback value (when useFallback)
 * 2. default (optional/nullable default parameter) → default value (when useDefault)
 * 3. reference (same instance) → type match → throw
 * Recursion depth is counted before generating each schema (lazy self-reference guard) and restored afterward.
 *
 * @typeParam T - The schema type
 * @param schema - The schema to generate a value for
 * @param ctx - The generation context
 * @returns A value matching the schema's output type
 * @throws {RecursionLimitReachedException} When the recursion depth limit is exceeded
 * @throws {NoGeneratorException} When no generator is registered for the schema type
 */
export function generate<T extends v.GenericSchema>(
  schema: T,
  ctx: GenerationContext,
): v.InferOutput<T> {
  const depth = ctx.recursion.get(schema as object) ?? 0;
  if (depth >= ctx.options.recursionLimit) {
    throw new RecursionLimitReachedException(ctx.options.recursionLimit);
  }
  ctx.recursion.set(schema as object, depth + 1);
  try {
    const fallback = getFallbackValue(schema);
    if (fallback !== NOT_SET && ctx.options.useFallback) {
      return fallback as v.InferOutput<T>;
    }
    const defaultValue = getDefaultValue(schema);
    if (defaultValue !== NOT_SET && ctx.options.useDefault) {
      return defaultValue as v.InferOutput<T>;
    }
    return generateValue(schema, ctx) as v.InferOutput<T>;
  } finally {
    ctx.recursion.set(schema as object, depth);
  }
}

/** Sentinel: distinguishes "not set" from "value is undefined" */
const NOT_SET = Symbol('not-set');

/**
 * Fallback value: read via valibot's built-in v.getFallback (both value and function fallbacks are handled by valibot).
 * Check property presence first — getFallback returns undefined for schemas without a fallback, so it cannot distinguish "not set".
 *
 * @param schema - The schema to read the fallback from
 * @returns The fallback value, or the NOT_SET sentinel when no fallback is set
 */
function getFallbackValue(schema: v.GenericSchema): unknown {
  // A fallback property value of undefined is treated as unset (valibot wrappers always carry the property)
  if ((schema as { fallback?: unknown }).fallback === undefined) return NOT_SET;
  return v.getFallback(schema);
}

/**
 * Default value: read via valibot's built-in v.getDefault (optional/nullable default parameters).
 *
 * @param schema - The schema to read the default from
 * @returns The default value, or the NOT_SET sentinel when no default is set
 */
function getDefaultValue(schema: v.GenericSchema): unknown {
  // optional/nullable/nullish/undefinedable always carry the default property; a value of undefined is treated as unset
  if ((schema as { default?: unknown }).default === undefined) return NOT_SET;
  return v.getDefault(schema);
}

function generateValue(
  schema: v.GenericSchema,
  ctx: GenerationContext,
): unknown {
  // reference: the same schema instance (custom generators take precedence)
  for (const def of ctx.generators) {
    if (def.schema !== undefined && def.schema === schema) {
      return def.generator(schema, ctx);
    }
  }
  // type match: dispatch valibot schemas by the schema.type string
  for (const def of ctx.generators) {
    if (def.type === schema.type) return def.generator(schema, ctx);
  }
  throw new NoGeneratorException(schema.type);
}

/**
 * Generator registration helper (built-ins register by type; custom generators can pass an instance or a type).
 *
 * @param type - The schema type to register the generator for
 * @param generator - The generator function
 * @returns The generator definition
 */
export function defineGenerator(
  type: string,
  generator: (schema: never, ctx: GenerationContext) => unknown,
): GeneratorDefinition {
  return {
    type,
    generator: generator as (
      schema: v.GenericSchema,
      ctx: GenerationContext,
    ) => unknown,
  };
}
