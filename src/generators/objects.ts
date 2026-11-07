import type * as v from 'valibot';

import { generate } from '../generate';
import type { GenerationContext } from '../types';
import { entriesOf } from '../utils';

/**
 * Object generator: generates each field recursively (field names are pushed onto path for defaults fallback lookup).
 *
 * @param schema - The valibot schema
 * @param ctx - The generation context
 * @returns A record of generated field values
 */
export const objectGenerator = (
  schema: v.GenericSchema,
  ctx: GenerationContext,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(entriesOf(schema))) {
    ctx.path.push(key);
    out[key] = generate(field, ctx);
    ctx.path.pop();
  }
  return out;
};
