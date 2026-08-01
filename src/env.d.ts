/// <reference types="astro/client" />

// Plain `tsc` (unlike `astro check`, which has its own language server) has no
// built-in way to resolve `.astro` file imports. This lets test files
// (e.g. tests/shell.test.ts) import `.astro` components directly for the
// Astro Container rendering pattern, typed as real component factories.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const Component: AstroComponentFactory;
  export default Component;
}
