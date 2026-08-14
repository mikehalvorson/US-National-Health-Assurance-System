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
