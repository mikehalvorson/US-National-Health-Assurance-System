export interface Tab { id: string; label: string; path: string }

/* The route registry, and the single source of navigation order and labels:
   TabNav renders this list, ChapterNav derives Back/Next from its order, and
   manifest-check.ts's routeDrift requires a page for every entry and an entry
   for every page. There is nothing to match this against - it is the
   authority. path '' = the index (Overview).

   R266 [§S1]: this said "Order + labels must match docs/index.html nav
   exactly", which made the live navigation's order a fidelity requirement
   against the tree §AL retired and R113 says must not be deployed, with
   nothing enforcing it. It was also already false: docs/index.html carries
   twelve buttons and neither Long-Term Care nor Risk is among them. */
export const TABS: Tab[] = [
  { id: 'tab-overview', label: 'Overview', path: '' },
  { id: 'tab-health', label: 'Healthcare', path: 'health' },
  { id: 'tab-tax', label: 'Taxes & Financing', path: 'tax' },
  { id: 'tab-legislation', label: 'Legislation', path: 'legislation' },
  { id: 'tab-units', label: 'Physical Care', path: 'units' },
  { id: 'tab-ltc', label: 'Long-Term Care', path: 'ltc' },
  { id: 'tab-medications', label: 'Medications', path: 'medications' },
  { id: 'tab-data', label: 'Data', path: 'data' },
  { id: 'tab-workforce', label: 'Workforce', path: 'workforce' },
  { id: 'tab-gov', label: 'Governance', path: 'gov' },
  { id: 'tab-hardening', label: 'Executive Hardening', path: 'hardening' },
  { id: 'tab-risk', label: 'Risk', path: 'risk' },
  { id: 'tab-rollout', label: 'Phased Rollout', path: 'rollout' },
  { id: 'tab-quality', label: 'Quality', path: 'quality' },
];

/* R163 / R270 [§S12]: one chapter number, in one format, from this list.
 *
 * Four surfaces were numbering chapters independently. ChapterNav computed
 * `Chapter 05` from this order; six page eyebrows typed `Chapter 5` by hand;
 * and index.astro's front-door grid typed its own two-digit sequence over a
 * hand-maintained list of eleven cards.
 *
 * The grid was the one that was wrong, and it was wrong in the direction
 * nobody checks: it predates Long-Term Care and Risk, so it omitted both and
 * every number from Medications on was one or two low against this registry.
 * Seven of its eleven numbers disagreed with the route the card linked to.
 * R163 read the same disagreement from the other end and concluded gov.astro
 * was the outlier because "the index is internally consistent"; the index was
 * consistent with itself and stale against the app.
 *
 * Overview is the front door and carries no number. Chapters count from 1 at
 * Healthcare, which is what both surviving surfaces already did. */
export const CHAPTERS: Tab[] = TABS.filter((t) => t.path !== '');

export function chapterNumber(path: string): number | null {
  const i = CHAPTERS.findIndex((t) => t.path === path);
  return i === -1 ? null : i + 1;
}

/* The single rendered form. Two digits, so a fourteen-chapter story does not
   mix "Chapter 9" with "Chapter 10" down one column. */
export function chapterMarker(n: number): string {
  return 'Chapter ' + String(n).padStart(2, '0');
}
