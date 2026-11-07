import type * as v from 'valibot';

import {
  bigintConstraints,
  dateRange,
  type NumberConstraints,
  numberConstraints,
  type StringConstraints,
  stringConstraints,
} from '../constraints';
import { faker } from '../faker';
import type { GenerationContext } from '../types';
import { tryValid } from '../utils';

const DEFAULT_MIN_LENGTH = 5;
const DEFAULT_MAX_LENGTH = 20;

/**
 * String generator: an empty (or minimum-length) string in init mode;
 * a random string honoring format/regex/length/affix constraints in mock mode.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated string satisfying the schema constraints
 */
export const stringGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): string => {
  const constraints = stringConstraints(schema);
  const { min, max } = resolveLengths(constraints, ctx);
  const generate = (): string => {
    if (constraints.format) {
      return formatString(constraints.format, constraints, schema, ctx);
    }
    if (constraints.regex) {
      return fromRegex(constraints.regex, min, max, ctx);
    }
    return buildString(constraints, min, max, ctx);
  };
  return tryValid(schema, generate) as string;
};

/**
 * Resolve the effective string length range from schema constraints and caller options.
 * Schema constraints are hard bounds; caller options narrow the range further.
 *
 * @param constraints - The extracted string constraints
 * @param ctx - The generation context
 * @returns The effective minimum and maximum length
 */
function resolveLengths(
  constraints: StringConstraints,
  ctx: GenerationContext,
): { min: number; max: number } {
  const configured = ctx.options.string.length;
  const userMin = Array.isArray(configured) ? configured[0] : configured;
  const userMax = Array.isArray(configured) ? configured[1] : configured;
  const desiredMin = userMin ?? DEFAULT_MIN_LENGTH;
  const desiredMax = userMax ?? DEFAULT_MAX_LENGTH;
  const hardMax = constraints.maxLength;
  const min = Math.max(
    constraints.minLength ?? 0,
    hardMax === undefined ? desiredMin : Math.min(desiredMin, hardMax),
  );
  let max =
    hardMax === undefined
      ? Math.max(desiredMax, min)
      : Math.min(hardMax, Math.max(desiredMax, min));
  if (max < min) max = min;
  return { min, max };
}

/**
 * Build a string that starts/ends/includes the required fragments.
 *
 * @param constraints - The extracted string constraints
 * @param min - The minimum length
 * @param max - The maximum length
 * @param ctx - The generation context
 * @returns A candidate string
 */
function buildString(
  constraints: StringConstraints,
  min: number,
  max: number,
  ctx: GenerationContext,
): string {
  const exact = constraints.exactLength;
  const target =
    exact ??
    (ctx.mode === 'init'
      ? (constraints.minLength ?? 0)
      : ctx.random.int(Math.max(0, min), Math.max(min, max)));
  const prefix = longest(constraints.startsWith);
  const suffix = longest(constraints.endsWith);
  const includes = (constraints.includes ?? []).join('');
  const fillerLength = Math.max(
    0,
    target - prefix.length - suffix.length - includes.length,
  );
  const filler = stripExcluded(
    faker.string.alpha({ length: fillerLength }),
    constraints.excludes ?? [],
  );
  return `${prefix}${filler}${includes}${suffix}`;
}

/**
 * Longest string of a list (used for startsWith/endsWith fragments).
 *
 * @param values - The fragment list
 * @returns The longest fragment (empty when the list is empty)
 */
function longest(values?: string[]): string {
  return (values ?? []).reduce(
    (current, value) => (value.length > current.length ? value : current),
    '',
  );
}

/**
 * Remove excluded substrings from a filler string.
 *
 * @param input - The filler string
 * @param excludes - The excluded substrings
 * @returns The sanitized filler string
 */
function stripExcluded(input: string, excludes: string[]): string {
  let output = input;
  const replacements = ['x', 'y', 'z', '0', '1', '_'];
  for (const exclude of excludes) {
    if (!exclude) continue;
    const replacement =
      replacements.find((char) => !exclude.includes(char)) ?? 'x';
    let guard = 0;
    while (output.includes(exclude) && guard++ <= input.length) {
      output = output.replace(exclude, replacement.repeat(exclude.length));
    }
  }
  return output;
}

/**
 * Translate the common regex shorthands into faker's `fromRegExp` template syntax.
 * faker does not understand `\d`/`\w`/`\s`, but does understand character classes.
 *
 * @param source - The regex source
 * @returns A pattern suitable for `faker.helpers.fromRegExp`
 */
function prepareRegexSource(source: string): string {
  let output = '';
  let inClass = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '\\' && index + 1 < source.length) {
      const next = source[index + 1];
      index++;
      switch (next) {
        case 'd':
          output += inClass ? '0-9' : '[0-9]';
          break;
        case 'w':
          output += inClass ? 'A-Za-z0-9_' : '[A-Za-z0-9_]';
          break;
        case 's':
          output += inClass ? ' \\t' : '[ \\t]';
          break;
        case '.':
          // faker treats `.` as a wildcard; a character class forces a literal dot
          output += inClass ? '.' : '[.]';
          break;
        default:
          output += next;
      }
      continue;
    }
    if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    output += char;
  }
  return output;
}

/**
 * Generate a string matching a regex using faker's `fromRegExp` (best effort).
 *
 * @param regex - The regex constraint
 * @param min - The minimum fallback length
 * @param max - The maximum fallback length
 * @param ctx - The generation context
 * @returns A candidate string
 */
function fromRegex(
  regex: RegExp,
  min: number,
  max: number,
  ctx: GenerationContext,
): string {
  try {
    // `fromRegExp` treats anchors literally when given a string pattern
    let source = regex.source;
    if (source.startsWith('^')) source = source.slice(1);
    if (source.endsWith('$') && !source.endsWith('\\$')) {
      source = source.slice(0, -1);
    }
    return faker.helpers.fromRegExp(prepareRegexSource(source));
  } catch {
    const length =
      ctx.mode === 'init' ? min : ctx.random.int(min, Math.max(min, max));
    return faker.string.alpha({ length });
  }
}

/**
 * Generate a string for a known pipe format.
 *
 * @param format - The format name
 * @param constraints - The extracted string constraints
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A formatted string
 */
function formatString(
  format: string,
  constraints: StringConstraints,
  schema: v.GenericSchema,
  ctx: GenerationContext,
): string {
  switch (format) {
    case 'email':
      return faker.internet.email();
    case 'url':
      return faker.internet.url();
    case 'uuid':
      return faker.string.uuid();
    case 'ip':
      return ctx.random.chance(0.5)
        ? faker.internet.ipv4()
        : faker.internet.ipv6();
    case 'ipv4':
      return faker.internet.ipv4();
    case 'ipv6':
      return faker.internet.ipv6();
    case 'mac':
      return faker.internet.mac();
    case 'mac48':
      return faker.internet.mac();
    case 'mac64':
      return randomMac64();
    case 'date-time':
      return randomDateTime(ctx, schema).slice(0, 16);
    case 'date-time-second':
      return randomDateTime(ctx, schema).slice(0, 19);
    case 'date':
      return randomDateTime(ctx, schema).slice(0, 10);
    case 'time':
      return randomTime(ctx, schema, false);
    case 'time-second':
      return randomTime(ctx, schema, true);
    case 'timestamp':
      return randomDateTime(ctx, schema);
    case 'week':
      return randomIsoWeek(ctx, schema);
    case 'emoji':
      return faker.internet.emoji();
    case 'base64':
      return toBase64(ctx.random.string(16, ALPHANUMERIC));
    case 'nanoid':
      return faker.string.nanoid();
    case 'ulid':
      return faker.string.ulid();
    case 'cuid2':
      return `c${faker.string.alpha({ length: 23, casing: 'lower' })}`;
    case 'decimal':
      return String(ctx.random.int(0, 999999));
    case 'digits':
      return String(ctx.random.int(0, 999999999));
    case 'hexadecimal':
      return faker.string.hexadecimal({ length: 8, casing: 'lower' });
    case 'hex_color':
      return `#${hexDigits(6)}`;
    case 'octal':
      return ctx.random.string(6, '01234567');
    case 'slug':
      return faker.string.alpha({ length: 10, casing: 'lower' });
    case 'domain':
      return `${faker.string.alpha({ length: 8, casing: 'lower' })}.com`;
    case 'bic':
      return faker.string.alpha({ length: 8, casing: 'upper' });
    case 'credit_card':
      return faker.finance.creditCardNumber();
    case 'imei':
      return randomImei();
    case 'isbn':
      return faker.commerce.isbn(13);
    case 'isrc':
      return `${faker.string.alpha({
        length: 2,
        casing: 'upper',
      })}${faker.string.alphanumeric({
        length: 3,
        casing: 'upper',
      })}${faker.string.numeric(7)}`;
    case 'jws_compact':
      return Array.from({ length: 3 }, () =>
        faker.string.alphanumeric({ length: 4, casing: 'lower' }),
      ).join('.');
    case 'ksuid':
      return faker.string.alphanumeric({ length: 27 });
    case 'hash': {
      const lengths = constraints.hashLengths?.length
        ? constraints.hashLengths
        : [64];
      return hexDigits(ctx.random.pick(lengths));
    }
    default:
      return faker.string.alpha({ length: 10 });
  }
}

const ALPHANUMERIC =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Random lowercase hex digits.
 *
 * @param length - The number of hex digits
 * @returns A hex string without a `0x` prefix
 */
function hexDigits(length: number): string {
  return faker.string.hexadecimal({ length, casing: 'lower' }).slice(2);
}

/**
 * Random 64-bit MAC address (eight colon-separated groups).
 *
 * @returns A MAC-64 string
 */
function randomMac64(): string {
  return Array.from({ length: 8 }, () => hexDigits(2)).join(':');
}

/**
 * Luhn check digit for a numeric string.
 *
 * @param partial - The digits before the check digit
 * @returns The check digit (0-9)
 */
function luhnCheckDigit(partial: string): number {
  let sum = 0;
  let double = true;
  for (let index = partial.length - 1; index >= 0; index--) {
    let digit = Number(partial[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Random Luhn-valid 15-digit IMEI.
 *
 * @returns An IMEI string
 */
function randomImei(): string {
  const partial = faker.string.numeric(14);
  return `${partial}${luhnCheckDigit(partial)}`;
}

/**
 * Random date within the effective schema/options range.
 *
 * @param ctx - The generation context
 * @param schema - The valibot schema
 * @returns An ISO date-time string (UTC)
 */
function randomDateTime(
  ctx: GenerationContext,
  schema: v.GenericSchema,
): string {
  const { min, max } = dateRange(schema, ctx.options.date);
  return faker.date.between({ from: min, to: max }).toISOString();
}

/**
 * Random ISO-8601 time (HH:mm:ss).
 *
 * @param ctx - The generation context
 * @param schema - The valibot schema
 * @returns A time string
 */
function randomTime(
  ctx: GenerationContext,
  schema: v.GenericSchema,
  withSeconds: boolean,
): string {
  const { min, max } = dateRange(schema, ctx.options.date);
  const date = faker.date.between({ from: min, to: max });
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  return withSeconds ? `${time}:${pad(date.getUTCSeconds())}` : time;
}

/**
 * Random ISO-8601 week (YYYY-Www).
 *
 * @param ctx - The generation context
 * @param schema - The valibot schema
 * @returns A week string
 */
function randomIsoWeek(
  ctx: GenerationContext,
  schema: v.GenericSchema,
): string {
  const { min, max } = dateRange(schema, ctx.options.date);
  const date = faker.date.between({ from: min, to: max });
  return `${date.getUTCFullYear()}-W${pad(ctx.random.int(1, 52))}`;
}

/**
 * Pad a number to two digits.
 *
 * @param value - The number to pad
 * @returns The two-digit string
 */
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Base64-encode an ASCII string.
 *
 * @param input - The string to encode
 * @returns The base64 representation
 */
function toBase64(input: string): string {
  return btoa(input);
}

/**
 * Clamp a value into the [min, max] range.
 *
 * @param value - The value to clamp
 * @param min - The lower bound
 * @param max - The upper bound
 * @returns The clamped value
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Step just above an exclusive lower bound.
 *
 * @param value - The exclusive bound
 * @returns The smallest practical inclusive value
 */
function bumpUp(value: number): number {
  return Number.isInteger(value)
    ? value + 1
    : value + Math.max(Number.EPSILON, Math.abs(value) * Number.EPSILON);
}

/**
 * Step just below an exclusive upper bound.
 *
 * @param value - The exclusive bound
 * @returns The largest practical inclusive value
 */
function bumpDown(value: number): number {
  return Number.isInteger(value)
    ? value - 1
    : value - Math.max(Number.EPSILON, Math.abs(value) * Number.EPSILON);
}

/**
 * Align a number up to the nearest multiple.
 *
 * @param value - The value to align
 * @param multiple - The positive multiple
 * @returns The aligned value
 */
function alignUp(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

/**
 * Align a number down to the nearest multiple.
 *
 * @param value - The value to align
 * @param multiple - The positive multiple
 * @returns The aligned value
 */
function alignDown(value: number, multiple: number): number {
  return Math.floor(value / multiple) * multiple;
}

/**
 * Resolve the effective number range (schema constraints, exclusive bounds included).
 *
 * @param constraints - The extracted number constraints
 * @returns The effective inclusive range
 */
function numberRange(constraints: NumberConstraints): {
  min: number;
  max: number;
} {
  let min = constraints.min ?? -1000;
  let max = constraints.max ?? 1000;
  if (constraints.exclusiveMin) min = bumpUp(min);
  if (constraints.exclusiveMax) max = bumpDown(max);
  if (max < min) max = min;
  return { min, max };
}

/**
 * Number generator: a valid zero-ish value in init mode; a random number within
 * constraints in mock mode (integer/multipleOf/exclusive bounds included).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated number satisfying the schema constraints
 */
export const numberGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): number => {
  const constraints = numberConstraints(schema);
  const { min, max } = numberRange(constraints);
  if (ctx.mode === 'init') {
    let value = clamp(0, min, max);
    if (constraints.multipleOf) {
      const aligned = alignUp(value, constraints.multipleOf);
      if (aligned <= max) value = aligned;
    }
    if (constraints.isInteger) value = Math.round(value);
    return value;
  }
  const generate = (): number => {
    if (constraints.multipleOf) {
      const start = alignUp(min, constraints.multipleOf);
      const end = alignDown(max, constraints.multipleOf);
      if (end >= start) {
        const steps = Math.round((end - start) / constraints.multipleOf);
        return start + ctx.random.int(0, steps) * constraints.multipleOf;
      }
    }
    if (constraints.isInteger) {
      const start = Math.ceil(min);
      const end = Math.floor(max);
      if (end >= start) return ctx.random.int(start, end);
    }
    return min + ctx.random.float() * (max - min);
  };
  return tryValid(schema, generate) as number;
};

/**
 * Align a bigint up to the nearest multiple (works for negative values).
 *
 * @param value - The value to align
 * @param multiple - The positive multiple
 * @returns The aligned value
 */
function alignBigIntUp(value: bigint, multiple: bigint): bigint {
  const remainder = value % multiple;
  if (remainder === 0n) return value;
  return remainder > 0n ? value + multiple - remainder : value - remainder;
}

/**
 * Bigint generator: a valid zero-ish value in init mode; a random bigint within
 * constraints in mock mode.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated bigint satisfying the schema constraints
 */
export const bigintGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): bigint => {
  const constraints = bigintConstraints(schema);
  const min = constraints.min ?? 0n;
  const max = constraints.max ?? 1000n;
  if (ctx.mode === 'init') {
    let value = 0n;
    if (value < min) value = min;
    if (value > max) value = max;
    if (constraints.multipleOf) {
      const aligned = alignBigIntUp(value, constraints.multipleOf);
      if (aligned <= max) value = aligned;
    }
    return value;
  }
  if (max <= min) return min;
  if (constraints.multipleOf) {
    const start = alignBigIntUp(min, constraints.multipleOf);
    const end = max;
    const steps = (end - start) / constraints.multipleOf;
    if (steps < 0n) return min;
    const capped = steps > 1000n ? 1000n : steps;
    return (
      start + BigInt(ctx.random.int(0, Number(capped))) * constraints.multipleOf
    );
  }
  const range = max - min;
  const steps = range > BigInt(Number.MAX_SAFE_INTEGER) ? 1000n : range;
  return min + BigInt(ctx.random.int(0, Number(steps)));
};

/**
 * Boolean generator: false in init; random in mock.
 *
 * @param _schema - The valibot schema (unused by this generator)
 * @param ctx - The generation context
 * @returns A generated boolean
 */
export const booleanGenerator = (
  _schema: v.GenericSchema,
  ctx: GenerationContext,
): boolean => {
  return ctx.mode === 'init' ? false : ctx.random.chance(0.5);
};

/**
 * Date generator: epoch (clamped into the schema range) in init; random date
 * within the effective range in mock.
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A generated Date
 */
export const dateGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Date => {
  const { min, max } = dateRange(schema, ctx.options.date);
  if (ctx.mode === 'init') {
    const epoch = new Date(0);
    if (epoch < min) return min;
    if (epoch > max) return max;
    return epoch;
  }
  return tryValid(schema, () =>
    faker.date.between({ from: min, to: max }),
  ) as Date;
};

/**
 * NaN generator: always returns NaN.
 *
 * @returns NaN
 */
export const nanGenerator = (): number => NaN;

/**
 * Symbol generator: always returns a new symbol.
 *
 * @returns A new Symbol
 */
export const symbolGenerator = (): symbol => Symbol();

/**
 * Instance generator: constructs a fresh instance when the constructor allows it;
 * falls back to an object with the correct prototype.
 *
 * @param schema - The valibot schema
 * @returns An instance of the schema's class
 */
export const instanceGenerator = (schema: v.GenericSchema): unknown => {
  const cls = (schema as unknown as { class: new (...args: never[]) => object })
    .class;
  try {
    return new (cls as new () => object)();
  } catch {
    return Object.create(cls.prototype);
  }
};
