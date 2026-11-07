import { defineGenerator } from '../generate';
import type { GeneratorDefinition } from '../types';
import {
  intersectGenerator,
  lazyGenerator,
  unionGenerator,
  variantGenerator,
} from './composites';
import {
  arrayGenerator,
  blobGenerator,
  fileGenerator,
  mapGenerator,
  recordGenerator,
  setGenerator,
  tupleGenerator,
} from './containers';
import {
  exactOptionalGenerator,
  functionGenerator,
  looseObjectGenerator,
  looseTupleGenerator,
  nonNullableGenerator,
  nonNullishGenerator,
  nonOptionalGenerator,
  objectWithRestGenerator,
  picklistGenerator,
  promiseGenerator,
  strictObjectGenerator,
  strictTupleGenerator,
  tupleWithRestGenerator,
} from './extras';
import { objectGenerator } from './objects';
import {
  bigintGenerator,
  booleanGenerator,
  dateGenerator,
  instanceGenerator,
  nanGenerator,
  numberGenerator,
  stringGenerator,
  symbolGenerator,
} from './primitives';
import { anyGenerator, customGenerator } from './specials';
import {
  nullableGenerator,
  nullishGenerator,
  optionalGenerator,
  undefinedableGenerator,
} from './wrappers';

/** Built-in generator registry: dispatched by valibot schema.type */
export const defaultGenerators: GeneratorDefinition[] = [
  // primitives
  defineGenerator('string', stringGenerator),
  defineGenerator('number', numberGenerator),
  defineGenerator('bigint', bigintGenerator),
  defineGenerator('boolean', booleanGenerator),
  defineGenerator('date', dateGenerator),
  defineGenerator('nan', nanGenerator),
  defineGenerator('symbol', symbolGenerator),
  defineGenerator(
    'literal',
    (schema) => (schema as { literal: unknown }).literal,
  ),
  defineGenerator('enum', (schema, ctx) => {
    const values = Object.values(
      (schema as { enum: Record<string, unknown> }).enum,
    );
    return ctx.mode === 'init' ? values[0] : ctx.random.pick(values);
  }),
  // containers
  defineGenerator('array', arrayGenerator),
  defineGenerator('tuple', tupleGenerator),
  defineGenerator('record', recordGenerator),
  defineGenerator('map', mapGenerator),
  defineGenerator('set', setGenerator),
  defineGenerator('blob', blobGenerator),
  defineGenerator('file', fileGenerator),
  // objects
  defineGenerator('object', objectGenerator),
  defineGenerator('loose_object', looseObjectGenerator),
  defineGenerator('strict_object', strictObjectGenerator),
  defineGenerator('object_with_rest', objectWithRestGenerator),
  defineGenerator('loose_tuple', looseTupleGenerator),
  defineGenerator('strict_tuple', strictTupleGenerator),
  defineGenerator('tuple_with_rest', tupleWithRestGenerator),
  // composites
  defineGenerator('union', unionGenerator),
  defineGenerator('variant', variantGenerator),
  defineGenerator('intersect', intersectGenerator),
  defineGenerator('lazy', lazyGenerator),
  // wrappers
  defineGenerator('optional', optionalGenerator),
  defineGenerator('nullable', nullableGenerator),
  defineGenerator('nullish', nullishGenerator),
  defineGenerator('undefinedable', undefinedableGenerator),
  defineGenerator('exact_optional', exactOptionalGenerator),
  defineGenerator('non_nullable', nonNullableGenerator),
  defineGenerator('non_nullish', nonNullishGenerator),
  defineGenerator('non_optional', nonOptionalGenerator),
  defineGenerator('picklist', picklistGenerator),
  // miscellaneous
  defineGenerator('instance', instanceGenerator),
  defineGenerator('promise', promiseGenerator),
  defineGenerator('function', functionGenerator),
  // unstructured types
  defineGenerator('any', anyGenerator),
  defineGenerator('unknown', anyGenerator),
  defineGenerator('undefined', anyGenerator),
  defineGenerator('void', anyGenerator),
  defineGenerator('null', anyGenerator),
  defineGenerator('never', anyGenerator),
  // cannot be generated (user predicates are not introspectable) → defaults/unhandled strategy
  defineGenerator('custom', customGenerator),
];
