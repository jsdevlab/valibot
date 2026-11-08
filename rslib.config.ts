import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'es2022',
      dts: { bundle: true, autoExtension: true },
    },
    {
      format: 'cjs',
      syntax: 'es2022',
      dts: { bundle: true, autoExtension: true },
    },
  ],
  // `web` keeps the output portable for both browsers and Node.js 20+.
  // The library uses only universal globals (Blob, File, btoa, Promise).
  output: {
    target: 'web',
  },
  source: {
    entry: {
      index: './src/index.ts',
    },
    tsconfigPath: './tsconfig.build.json',
  },
});
