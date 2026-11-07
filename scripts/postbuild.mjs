import { copyFileSync } from 'node:fs';

// Rslib emits a single index.d.ts for both formats. CommonJS consumers need a
// .d.cts declaration so TypeScript's node16/nodenext resolution does not treat
// the package's types as ESM-only (TS1479).
copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
