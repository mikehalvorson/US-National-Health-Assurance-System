/* R131 [§S2]: every tool in tools/ declares the runtime it needs.
 *
 * The repo carried two extractors that did the same job in two languages -
 * tools/extract_docx.py, committed but never executed, and tools/extract_docx.mjs,
 * the Node port that actually produced the extracts. Running the Python one for
 * the first time settled it: on all three .docx files the two produce the same
 * content byte for byte, and the only divergence is line endings, because
 * Python's text-mode write translates \n to \r\n on Windows while the port
 * writes \n. So the port is faithful, and the duplicate is gone.
 *
 * What is left is the reason the duplicate existed: nothing said which runtime
 * a given tool needs, so "there is no Python on this machine" turned into a
 * second implementation rather than a stated prerequisite. The table below is
 * that statement, and this check keeps it exhaustive - a new tool with no entry
 * fails the build, and an entry for a tool that no longer exists fails too.
 *
 * The manifest is the source of what is in tools/, so this cannot drift from
 * the directory without R271's own check failing first.
 */
import { FILE_MANIFEST } from './file-manifest';

export interface ToolChain {
  path: string;
  runtime: 'node' | 'python' | 'powershell' | 'data';
  needs: string;
  produces: string;
}

export const TOOLCHAINS: ToolChain[] = [
  {
    path: 'tools/build_canonical_registries.mjs',
    runtime: 'node',
    needs: 'Node 22 (pinned by Volta in package.json), stdlib only',
    produces: 'research/cp_registry_canonical.csv and the KPP/TPP registry extracts'
  },
  {
    path: 'tools/build_data_phase_targets.py',
    runtime: 'python',
    needs: 'CPython 3.11+, stdlib only; reads the generated src/lib/quality-data.ts',
    produces: 'src/lib/data-phases.ts and research/data_phase_target_methodology.md'
  },
  {
    path: 'tools/build_file_manifest.mjs',
    runtime: 'node',
    needs: 'Node 22, stdlib only',
    produces: 'src/lib/file-manifest.ts, the inventory R271 gates the build against'
  },
  {
    path: 'tools/extract_docx.mjs',
    runtime: 'node',
    needs: 'Node 22, stdlib only (zlib + fs); no npm install and no Python',
    produces: 'a greppable text extract of any .docx, tables kept as pipe rows'
  },
  {
    path: 'tools/extract_quality_catalog.py',
    runtime: 'python',
    needs: 'CPython 3.11+ and python-docx; reads the framework DOCX at the repo root',
    produces: 'src/lib/quality-data.ts, the controlled KPP/TPP/CP catalog'
  },
  {
    path: 'tools/model_hospital_regions.py',
    runtime: 'python',
    needs: 'CPython 3.11+, stdlib only',
    produces: 'the hospital-region assignment and contiguity check behind the map data'
  },
  {
    path: 'tools/quality_catalog_addendum.json',
    runtime: 'data',
    needs: 'nothing: it is read by extract_quality_catalog.py, not executed',
    produces: 'the ten records that are not in the DOCX, kept machine-readable (R115)'
  },
  {
    path: 'tools/serve.ps1',
    runtime: 'powershell',
    needs: 'Windows PowerShell 5.1 or PowerShell 7',
    produces: 'a local static server for the built site'
  }
];

export function toolsInManifest(): string[] {
  return FILE_MANIFEST.filter((p) => p.startsWith('tools/')).sort();
}

export interface ToolchainDrift {
  undeclared: string[]; /* in tools/, with no entry */
  stale: string[]; /* declared, no longer in tools/ */
  unexplained: string[]; /* declared, but the entry says nothing usable */
}

export function toolchainDrift(): ToolchainDrift {
  const declared = new Map(TOOLCHAINS.map((t) => [t.path, t] as const));
  const present = new Set(toolsInManifest());
  return {
    undeclared: [...present].filter((p) => !declared.has(p)).sort(),
    stale: [...declared.keys()].filter((p) => !present.has(p)).sort(),
    unexplained: TOOLCHAINS
      .filter((t) => t.needs.trim().length < 12 || t.produces.trim().length < 12)
      .map((t) => t.path)
      .sort()
  };
}
