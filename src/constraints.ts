import * as v from 'valibot';

import type { DateOptions } from './types';

/** A valibot action (a validation/transformation item inside a pipe) */
interface ValibotAction {
  type: string;
  requirement?: unknown;
}

/**
 * Read the schema's pipe (the valibot constraint chain; the base schema itself has no constraints, they all live in the pipe).
 *
 * @param schema - The schema to read the pipe from
 * @returns The pipe actions (an empty array when the schema has no pipe)
 */
function actions(schema: v.GenericSchema): ValibotAction[] {
  return ((schema as { pipe?: unknown[] }).pipe ?? []) as ValibotAction[];
}

function numberOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function dateOf(value: unknown): Date | undefined {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value
    : undefined;
}

/** String constraints extracted from a string schema's pipe */
export interface StringConstraints {
  minLength?: number;
  maxLength?: number;
  exactLength?: number;
  format?: string;
  regex?: RegExp;
  /** Hex digest lengths required by `v.hash(...)` */
  hashLengths?: number[];
  includes?: string[];
  excludes?: string[];
  startsWith?: string[];
  endsWith?: string[];
}

/**
 * Extracts string constraints from a schema's pipe.
 *
 * @param schema - The valibot schema
 * @returns The extracted string constraints
 */
export function stringConstraints(schema: v.GenericSchema): StringConstraints {
  const out: StringConstraints = {};
  for (const action of actions(schema)) {
    const req = action.requirement;
    switch (action.type) {
      case 'min_length':
      case 'min_bytes':
      case 'min_code_points':
      case 'min_graphemes': {
        const min = numberOf(req);
        if (min !== undefined)
          out.minLength = Math.max(out.minLength ?? 0, min);
        break;
      }
      case 'max_length':
      case 'max_bytes':
      case 'max_code_points':
      case 'max_graphemes': {
        const max = numberOf(req);
        if (max !== undefined) {
          out.maxLength = Math.min(
            out.maxLength ?? Number.POSITIVE_INFINITY,
            max,
          );
        }
        break;
      }
      case 'length':
        out.exactLength = numberOf(req);
        break;
      case 'non_empty':
        out.minLength = Math.max(out.minLength ?? 0, 1);
        break;
      case 'empty':
        out.maxLength = Math.min(out.maxLength ?? 0, 0);
        break;
      case 'email':
      case 'rfc_email':
        out.format = 'email';
        break;
      case 'url':
        out.format = 'url';
        break;
      case 'uuid':
        out.format = 'uuid';
        break;
      case 'ip':
      case 'ipv4':
      case 'ipv6':
        out.format = action.type;
        break;
      case 'mac':
      case 'mac48':
      case 'mac64':
        out.format = action.type;
        break;
      case 'iso_date_time':
        out.format = 'date-time';
        break;
      case 'iso_date_time_second':
        out.format = 'date-time-second';
        break;
      case 'iso_date':
        out.format = 'date';
        break;
      case 'iso_time':
        out.format = 'time';
        break;
      case 'iso_time_second':
        out.format = 'time-second';
        break;
      case 'iso_week':
        out.format = 'week';
        break;
      case 'iso_timestamp':
        out.format = 'timestamp';
        break;
      case 'emoji':
      case 'base64':
      case 'decimal':
      case 'digits':
      case 'hexadecimal':
      case 'octal':
      case 'slug':
      case 'domain':
      case 'bic':
      case 'credit_card':
      case 'hex_color':
      case 'imei':
      case 'isbn':
      case 'isrc':
      case 'jws_compact':
      case 'ksuid':
        out.format = action.type;
        break;
      case 'cuid2':
        out.format = 'cuid2';
        break;
      case 'nanoid':
      case 'ulid':
        out.format = action.type;
        break;
      case 'hash':
        out.format = 'hash';
        out.hashLengths = hashLengthsOf(req);
        break;
      case 'regex':
        out.regex = req as RegExp;
        break;
      case 'includes':
        out.includes = (out.includes ?? []).concat(req as string);
        break;
      case 'excludes':
        out.excludes = (out.excludes ?? []).concat(req as string);
        break;
      case 'starts_with':
        out.startsWith = (out.startsWith ?? []).concat(req as string);
        break;
      case 'ends_with':
        out.endsWith = (out.endsWith ?? []).concat(req as string);
        break;
    }
  }
  return out;
}

/**
 * Extract the digest lengths from a `v.hash(...)` requirement regex, e.g. `^[a-f0-9]{32}$`.
 *
 * @param requirement - The hash action requirement
 * @returns The digest lengths (empty when they cannot be detected)
 */
function hashLengthsOf(requirement: unknown): number[] {
  if (!(requirement instanceof RegExp)) return [];
  return [...requirement.source.matchAll(/\{(\d+)\}/g)].map((match) =>
    Number(match[1]),
  );
}

/** Number constraints extracted from a number schema's pipe */
export interface NumberConstraints {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  multipleOf?: number;
  isInteger?: boolean;
}

/**
 * Extracts number constraints from a schema's pipe.
 *
 * @param schema - The valibot schema
 * @returns The extracted number constraints
 */
export function numberConstraints(schema: v.GenericSchema): NumberConstraints {
  const out: NumberConstraints = {};
  for (const action of actions(schema)) {
    const req = action.requirement;
    if (action.type === 'integer' || action.type === 'safe_integer') {
      out.isInteger = true;
      continue;
    }
    if (action.type === 'multiple_of') {
      const multiple = numberOf(req);
      if (multiple !== undefined && multiple > 0) out.multipleOf = multiple;
      continue;
    }
    const bound = numberOf(req);
    if (bound === undefined) continue;
    switch (action.type) {
      case 'min_value':
        out.min = out.min === undefined ? bound : Math.max(out.min, bound);
        break;
      case 'max_value':
        out.max = out.max === undefined ? bound : Math.min(out.max, bound);
        break;
      case 'gt_value':
        out.min = out.min === undefined ? bound : Math.max(out.min, bound);
        out.exclusiveMin = true;
        break;
      case 'lt_value':
        out.max = out.max === undefined ? bound : Math.min(out.max, bound);
        out.exclusiveMax = true;
        break;
    }
  }
  return out;
}

/** BigInt constraints extracted from a bigint schema's pipe */
export interface BigIntConstraints {
  min?: bigint;
  max?: bigint;
  multipleOf?: bigint;
}

/**
 * Extracts bigint constraints from a schema's pipe.
 *
 * @param schema - The valibot schema
 * @returns The extracted bigint constraints
 */
export function bigintConstraints(schema: v.GenericSchema): BigIntConstraints {
  const out: BigIntConstraints = {};
  for (const action of actions(schema)) {
    const req = action.requirement;
    if (typeof req !== 'bigint') continue;
    switch (action.type) {
      case 'min_value':
        out.min = out.min === undefined || req > out.min ? req : out.min;
        break;
      case 'max_value':
        out.max = out.max === undefined || req < out.max ? req : out.max;
        break;
      case 'gt_value':
        if (out.min === undefined || req >= out.min) out.min = req + 1n;
        break;
      case 'lt_value':
        if (out.max === undefined || req <= out.max) out.max = req - 1n;
        break;
      case 'multiple_of':
        if (req > 0n) out.multipleOf = req;
        break;
    }
  }
  return out;
}

/** Date constraints extracted from a date schema's pipe */
export interface DateConstraints {
  min?: Date;
  max?: Date;
}

/**
 * Extracts date constraints (`minValue`/`maxValue`/`gtValue`/`ltValue`) from a date schema's pipe.
 *
 * @param schema - The valibot schema
 * @returns The extracted date constraints
 */
export function dateConstraints(schema: v.GenericSchema): DateConstraints {
  const out: DateConstraints = {};
  for (const action of actions(schema)) {
    const req = dateOf(action.requirement);
    if (!req) continue;
    switch (action.type) {
      case 'min_value':
        if (!out.min || req > out.min) out.min = req;
        break;
      case 'gt_value':
        if (!out.min || req >= out.min) out.min = new Date(req.getTime() + 1);
        break;
      case 'max_value':
        if (!out.max || req < out.max) out.max = req;
        break;
      case 'lt_value':
        if (!out.max || req <= out.max) out.max = new Date(req.getTime() - 1);
        break;
    }
  }
  return out;
}

const DEFAULT_DATE_MIN = new Date('1970-01-01T00:00:00Z');
const DEFAULT_DATE_MAX = new Date('2100-01-01T00:00:00Z');

/**
 * Later of two optional dates.
 *
 * @param left - The first date
 * @param right - The second date
 * @returns The later date, or undefined when both are undefined
 */
function later(left?: Date, right?: Date): Date | undefined {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

/**
 * Earlier of two optional dates.
 *
 * @param left - The first date
 * @param right - The second date
 * @returns The earlier date, or undefined when both are undefined
 */
function earlier(left?: Date, right?: Date): Date | undefined {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

/**
 * Resolve the effective date range from schema constraints and caller options.
 * Schema constraints are hard bounds; options can narrow the range further.
 * When options conflict with the constraints, the schema constraints win.
 *
 * @param schema - The valibot schema
 * @param options - The caller-provided date options
 * @returns A valid (possibly zero-width) date range
 */
export function dateRange(
  schema: v.GenericSchema,
  options: DateOptions = {},
): { min: Date; max: Date } {
  const constraints = dateConstraints(schema);
  // Options may only narrow the constraint range
  let minDate = later(options.min, constraints.min);
  let maxDate = earlier(options.max, constraints.max);
  // Fill missing bounds with defaults, but never outside an existing bound
  if (minDate === undefined) {
    minDate = earlier(DEFAULT_DATE_MIN, maxDate) ?? DEFAULT_DATE_MIN;
  }
  if (maxDate === undefined) {
    maxDate = later(DEFAULT_DATE_MAX, minDate) ?? DEFAULT_DATE_MAX;
  }
  if (maxDate < minDate) {
    // Conflicting options/constraints: fall back to the schema constraints
    minDate = constraints.min ?? maxDate;
    maxDate = constraints.max ?? minDate;
  }
  if (maxDate < minDate) maxDate = minDate;
  return { min: minDate, max: maxDate };
}

/** Array constraints extracted from an array schema's pipe */
export interface ArrayConstraints {
  minLength?: number;
  maxLength?: number;
}

/**
 * Extracts array constraints from a schema's pipe.
 *
 * @param schema - The valibot schema
 * @returns The extracted array constraints
 */
export function arrayConstraints(schema: v.GenericSchema): ArrayConstraints {
  const out: ArrayConstraints = {};
  for (const action of actions(schema)) {
    const req = numberOf(action.requirement);
    if (action.type === 'non_empty') {
      out.minLength = Math.max(out.minLength ?? 0, 1);
    } else if (action.type === 'empty') {
      out.maxLength = Math.min(out.maxLength ?? 0, 0);
    } else if (req !== undefined) {
      switch (action.type) {
        case 'min_length':
          out.minLength = Math.max(out.minLength ?? 0, req);
          break;
        case 'max_length':
          out.maxLength = Math.min(
            out.maxLength ?? Number.POSITIVE_INFINITY,
            req,
          );
          break;
      }
    }
  }
  return out;
}

/** Size constraints for record/map/set/blob/file schemas */
export interface SizeConstraints {
  min?: number;
  max?: number;
  exact?: number;
}

/**
 * Extracts size/entry constraints from a record, map, set, blob or file schema's pipe.
 *
 * @param schema - The valibot schema
 * @returns The extracted size constraints
 */
export function sizeConstraints(schema: v.GenericSchema): SizeConstraints {
  const out: SizeConstraints = {};
  for (const action of actions(schema)) {
    const req = numberOf(action.requirement);
    if (req === undefined) continue;
    switch (action.type) {
      case 'min_size':
      case 'min_entries':
        out.min = Math.max(out.min ?? 0, req);
        break;
      case 'max_size':
      case 'max_entries':
        out.max = Math.min(out.max ?? Number.POSITIVE_INFINITY, req);
        break;
      case 'size':
        out.exact = req;
        break;
    }
  }
  return out;
}

/**
 * Strip the base schema out of the pipe (pipe[0] is the base schema itself).
 *
 * @param schema - The schema to strip
 * @returns The base schema (the schema itself when it has no pipe)
 */
export function baseOf(schema: v.GenericSchema): v.GenericSchema {
  const pipe = (schema as { pipe?: v.GenericSchema[] }).pipe;
  return pipe ? (pipe[0] as v.GenericSchema) : schema;
}

/**
 * Validate a generated value (full valibot validation, including all pipe constraints).
 * Checks that throw (custom/async predicates) are treated as a failed validation.
 *
 * @param schema - The schema to validate against
 * @param value - The value to validate
 * @returns Whether the value passes validation
 */
export function isValid(schema: v.GenericSchema, value: unknown): boolean {
  try {
    return v.safeParse(schema, value).success;
  } catch {
    return false;
  }
}
