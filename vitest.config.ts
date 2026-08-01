import { getViteConfig } from 'astro/config';

export default getViteConfig({
  // Astro's config `base` is resolved into Vite's `define` map for esbuild/rollup
  // (production build) transforms, but Vitest's SSR module runner reads
  // `import.meta.env.BASE_URL` from Vite's own top-level `base` option instead.
  // Set it explicitly here so tests see the same BASE_URL the real build emits.
  base: '/US-National-Health-Assurance-System/',
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
