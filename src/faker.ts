import { base, en, Faker } from '@faker-js/faker';

/**
 * Dedicated faker instance.
 *
 * Using a private instance (instead of the package-level `faker` singleton) keeps
 * `create`/`mock` from mutating the caller's global faker seed and random state.
 * `base` supplies locale-independent data (emoji, ...) that `en` alone lacks.
 */
export const faker = new Faker({ locale: [en, base] });
