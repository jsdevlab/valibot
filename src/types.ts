import type * as v from 'valibot';

/** Generation mode: init deterministic initialization / mock random */
export type GeneratorMode = 'init' | 'mock';

/** Generator: schema → a value matching its InferOutput type (deterministic in init, random in mock) */
export type Generator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
) => unknown;

/** Custom generator registration: by schema instance (reference) or schema.type (type match) */
export interface GeneratorDefinition {
  schema?: v.GenericSchema;
  type?: string;
  generator: Generator;
}

/** Container size range */
export interface SizeOptions {
  min?: number;
  max?: number;
}

/** Probability of generating the inner value for wrappers like optional/nullable in mock mode */
export interface ChanceOptions {
  chance?: number;
}

/** String options */
export interface StringOptions {
  length?: number | [number, number];
}

/** Date range */
export interface DateOptions {
  min?: Date;
  max?: Date;
}

/** How to handle schemas that cannot generate/initialize a value (special/custom, etc.) */
export type UnhandledStrategy = 'throw' | 'skip';

/** Generation options (second argument of create / mock) */
export interface ValibotOptions {
  /** Random seed (default 1; same seed yields the same result, reproducible) */
  seed?: number;
  /** Recursion depth limit (lazy self-reference guard, default 10) */
  recursionLimit?: number;
  /** Custom generators (instance or type match, take precedence over built-ins) */
  generators?: GeneratorDefinition[];
  array?: SizeOptions;
  record?: SizeOptions;
  map?: SizeOptions;
  set?: SizeOptions;
  optional?: ChanceOptions;
  nullable?: ChanceOptions;
  /** Whether to prefer field default values (optional/nullable default parameters; default true) */
  useDefault?: boolean;
  /** Whether to prefer fallback values (v.fallback wrapper; default true) */
  useFallback?: boolean;
  /** How to handle schemas that cannot generate a value: 'throw' (default) throws / 'skip' returns undefined */
  unhandled?: UnhandledStrategy;
  date?: DateOptions;
  string?: StringOptions;
}

/** Generation context: shared throughout a single generation run */
export interface GenerationContext {
  mode: GeneratorMode;
  /** Random utilities (faker wrapper, same seed yields the same sequence) */
  random: Random;
  /** Current field path (object field names, used for defaults fallback lookup) */
  path: Array<string | number>;
  /** Recursion depth counter (lazy self-reference detection) */
  recursion: Map<object, number>;
  options: Required<ValibotOptions>;
  generators: GeneratorDefinition[];
  /** Caller-provided defaults (generators look up fallback values by path) */
  defaults?: unknown;
}

/** Random utilities */
export interface Random {
  /**
   * Float in [0, 1).
   *
   * @returns A random float in [0, 1)
   */
  float(): number;
  /**
   * Integer in the closed interval [min, max].
   *
   * @param min - The lower bound (inclusive)
   * @param max - The upper bound (inclusive)
   * @returns A random integer in [min, max]
   */
  int(min: number, max: number): number;
  /**
   * Pick a random element from an array.
   *
   * @typeParam T - The element type
   * @param items - The array to pick from
   * @returns A random element
   */
  pick<T>(items: readonly T[]): T;
  /**
   * Returns true with probability p.
   *
   * @param p - The probability of returning true
   * @returns Whether the chance was hit
   */
  chance(p: number): boolean;
  /**
   * Generate a string of the given length from a charset.
   *
   * @param length - The length of the string
   * @param charset - The characters to pick from
   * @returns A random string
   */
  string(length: number, charset: string): string;
}

/**
 * No generator is available.
 *
 * @param type - The schema type that has no generator
 */
export class NoGeneratorException extends Error {
  constructor(type: string) {
    super(`No generator for schema type: ${type}`);
    this.name = 'NoGeneratorException';
  }
}

/**
 * Recursion depth limit exceeded (lazy self-reference).
 *
 * @param limit - The recursion limit that was exceeded
 */
export class RecursionLimitReachedException extends Error {
  constructor(limit: number) {
    super(`Recursion limit reached (${limit})`);
    this.name = 'RecursionLimitReachedException';
  }
}
