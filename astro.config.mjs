// @ts-check
import { defineConfig } from 'astro/config';
import {
  assertReadmeCountCurrent,
  assertSelfTestsPass,
  selfTestSummary
} from './src/lib/selftests.ts';

/* R152 [§S0]: make a failing self-test fail the build.
   The gate lives here rather than on a page because it must not depend on which
   pages exist: health.astro renders the footer panel, but deleting that page
   would silently remove the gate with it. astro:build:start runs once, before
   any route is emitted, so a broken invariant stops the build rather than
   shipping as a red row in a footer. */
function selfTestGate() {
  return {
    name: 'nha-self-test-gate',
    hooks: {
      /** @param {{ logger: { info: (msg: string) => void } }} ctx */
      'astro:build:start': (ctx) => {
        const logger = ctx.logger;
        const summary = selfTestSummary();
        assertSelfTestsPass(summary);
        assertReadmeCountCurrent(summary);
        logger.info(`self-tests: ${summary.passed} of ${summary.total} pass`);
      }
    }
  };
}

export default defineConfig({
  site: 'https://mikehalvorson.github.io',
  base: '/US-National-Health-Assurance-System/',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [selfTestGate()],
});
