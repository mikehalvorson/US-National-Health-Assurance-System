/* The shape §S3 wrote six times: a declared set against a live one, compared
 * in BOTH directions.
 *
 * Every one of the section's registries has the same two failure modes. A live
 * thing nobody declared is the one people think of - a new rollout kind, a new
 * metric with no relevance rule, a second parser. The reverse is the one that
 * rots quietly: a declaration whose subject has gone, which leaves the registry
 * describing a pipeline that no longer exists. Both are one set difference, and
 * writing them out per site is how the two halves drift apart.
 *
 * No imports on purpose. phase-targets.ts is in the client bundle, so anything
 * it depends on has to stay free of node:fs.
 */
export interface DeclaredVsLive {
  /* live, not declared */
  undeclared: string[];
  /* declared, not live */
  stale: string[];
}

export function declaredVsLive(
  declared: Iterable<string>,
  live: Iterable<string>
): DeclaredVsLive {
  const declaredSet = new Set(declared);
  const liveSet = new Set(live);
  return {
    undeclared: [...liveSet].filter((x) => !declaredSet.has(x)).sort(),
    stale: [...declaredSet].filter((x) => !liveSet.has(x)).sort()
  };
}
