import { getViteConfig } from 'astro/config';

export default getViteConfig({
  // Astro's config `base` is resolved into Vite's `define` map for esbuild/rollup
  // (production build) transforms, but Vitest's SSR module runner reads
  // `import.meta.env.BASE_URL` from Vite's own top-level `base` option instead.
  // Set it explicitly here so tests see the same BASE_URL the real build emits.
  base: '/US-National-Health-Assurance-System/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    /* R25 [§S6a]: the ensemble is 1,500 draws now rather than 600, and several
       tests run the whole self-test summary, which runs it several times over.
       Alone each finishes in a couple of seconds; under the suite's own
       parallelism they crossed vitest's 5s default and failed as timeouts
       rather than as anything real. */
    testTimeout: 30000,
  },
});
