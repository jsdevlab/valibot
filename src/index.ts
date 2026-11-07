import type * as v from 'valibot';

import { faker } from './faker';
import { generate } from './generate';
import { defaultGenerators } from './generators';
import type { GenerationContext, Random, ValibotOptions } from './types';
import { isPlainObject } from './utils';

export type {
  ChanceOptions,
  DateOptions,
  GenerationContext,
  Generator,
  GeneratorDefinition,
  GeneratorMode,
  Random,
  SizeOptions,
  StringOptions,
  UnhandledStrategy,
  ValibotOptions,
} from './types';
export {
  NoGeneratorException,
  RecursionLimitReachedException,
} from './types';

/** Deep Partial: fields of nested objects can be partially overridden */
export type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

/** Generation options: extends ValibotOptions with caller-provided field default overrides */
export interface GenerateOptions<T extends v.GenericSchema>
  extends ValibotOptions {
  /** Overrides field defaults of the generated result (deep-merged; type is DeepPartial<v.InferOutput<T>>) */
  defaults?: DeepPartial<v.InferOutput<T>>;
}

const DEFAULT_OPTIONS: Required<ValibotOptions> = {
  seed: 1,
  recursionLimit: 10,
  generators: [],
  array: { min: 0, max: 10 },
  record: { min: 0, max: 10 },
  map: { min: 0, max: 10 },
  set: { min: 0, max: 10 },
  optional: { chance: 0.3 },
  nullable: { chance: 0.3 },
  useDefault: true,
  useFallback: true,
  unhandled: 'throw',
  date: {},
  string: {},
};

function normalizeOptions(options: ValibotOptions): Required<ValibotOptions> {
  return {
    seed: options.seed ?? DEFAULT_OPTIONS.seed,
    recursionLimit: options.recursionLimit ?? DEFAULT_OPTIONS.recursionLimit,
    generators: options.generators ?? [],
    array: { ...DEFAULT_OPTIONS.array, ...options.array },
    record: { ...DEFAULT_OPTIONS.record, ...options.record },
    map: { ...DEFAULT_OPTIONS.map, ...options.map },
    set: { ...DEFAULT_OPTIONS.set, ...options.set },
    optional: { ...DEFAULT_OPTIONS.optional, ...options.optional },
    nullable: { ...DEFAULT_OPTIONS.nullable, ...options.nullable },
    useDefault: options.useDefault ?? DEFAULT_OPTIONS.useDefault,
    useFallback: options.useFallback ?? DEFAULT_OPTIONS.useFallback,
    unhandled: options.unhandled ?? DEFAULT_OPTIONS.unhandled,
    date: { ...DEFAULT_OPTIONS.date, ...options.date },
    string: { ...DEFAULT_OPTIONS.string, ...options.string },
  };
}

/**
 * Wrap faker as Random (faker.seed is synced in run).
 *
 * @returns A Random implementation backed by faker
 */
function createRandom(): Random {
  return {
    float: () => faker.number.float({ min: 0, max: 1 }),
    int: (min, max) => faker.number.int({ min, max }),
    pick: (items) => faker.helpers.arrayElement([...items]),
    chance: (p) => faker.number.float({ min: 0, max: 1 }) < p,
    string: (length, charset) =>
      faker.string.fromCharacters(charset.split(''), length),
  };
}

/**
 * Deep-merge caller defaults into the generated result.
 * Plain objects are merged recursively; any other value (including null, arrays,
 * Map/Set/Date instances, ...) replaces the generated value.
 *
 * @param value - The generated value
 * @param defaults - The caller-provided defaults
 * @returns The merged result
 */
function applyDefaults(value: unknown, defaults?: unknown): unknown {
  if (defaults === undefined) return value;
  if (isPlainObject(value) && isPlainObject(defaults)) {
    const out: Record<string, unknown> = { ...value };
    for (const [key, sub] of Object.entries(defaults)) {
      out[key] = applyDefaults(value[key], sub);
    }
    return out;
  }
  return defaults;
}

function run<T extends v.GenericSchema>(
  schema: T,
  mode: 'init' | 'mock',
  options: GenerateOptions<T> = {},
): v.InferOutput<T> {
  const normalized = normalizeOptions(options);
  // Seed the private faker instance: init uses a fixed 0 (deterministic), mock uses the caller's seed (reproducible)
  faker.seed(mode === 'init' ? 0 : normalized.seed);
  const ctx: GenerationContext = {
    mode,
    random: createRandom(),
    path: [],
    recursion: new Map(),
    options: normalized,
    generators: [...normalized.generators, ...defaultGenerators],
    defaults: options.defaults,
  };
  const value = generate(schema, ctx);
  return applyDefaults(value, options.defaults) as v.InferOutput<T>;
}

/**
 * Generates deterministic initialization data from a valibot schema (form initial values / blank objects).
 * Respects field default values (optional/nullable default parameters) and fallback values (v.fallback).
 * `defaults` can override any field of the generated result (DeepPartial<v.InferOutput<T>>).
 *
 * @typeParam T - The schema type
 * @param schema - The valibot schema
 * @param options - Generation options
 * @returns An initialization value matching the schema's output type
 */
export function create<T extends v.GenericSchema>(
  schema: T,
  options: GenerateOptions<T> = {},
): v.InferOutput<T> {
  return run(schema, 'init', options);
}

/**
 * Generates random mock data from a valibot schema (testing / demos).
 * Mock data such as strings is produced by faker; respects default/fallback values and schema constraints (length/range/format/regex).
 * Results are reproducible with the same seed. `defaults` can override any field of the generated result.
 *
 * @typeParam T - The schema type
 * @param schema - The valibot schema
 * @param options - Generation options
 * @returns A random value matching the schema's output type
 */
export function mock<T extends v.GenericSchema>(
  schema: T,
  options: GenerateOptions<T> = {},
): v.InferOutput<T> {
  return run(schema, 'mock', options);
}
