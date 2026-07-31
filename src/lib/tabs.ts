export interface Tab { id: string; label: string; path: string; ported?: boolean }

// Order + labels must match docs/index.html nav exactly. path '' = the index (Overview).
export const TABS: Tab[] = [
  { id: 'tab-overview', label: 'Overview', path: '' },
  { id: 'tab-health', label: 'Healthcare', path: 'health' },
  { id: 'tab-tax', label: 'Taxes & Financing', path: 'tax' },
  { id: 'tab-legislation', label: 'Legislation', path: 'legislation', ported: true },
  { id: 'tab-units', label: 'Physical Care', path: 'units' },
  { id: 'tab-medications', label: 'Medications', path: 'medications' },
  { id: 'tab-data', label: 'Data', path: 'data', ported: true },
  { id: 'tab-workforce', label: 'Workforce', path: 'workforce', ported: true },
  { id: 'tab-gov', label: 'Governance', path: 'gov', ported: true },
  { id: 'tab-hardening', label: 'Executive Hardening', path: 'hardening', ported: true },
  { id: 'tab-rollout', label: 'Phased Rollout', path: 'rollout', ported: true },
  { id: 'tab-quality', label: 'Quality', path: 'quality' },
];
