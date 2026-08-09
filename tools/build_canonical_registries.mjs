/**
 * Build research/cp_registry_canonical.csv and research/kpp_tpp_registry_canonical.csv
 * from research/source_package_extract.md. Transcription only: no inferred values.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "research/source_package_extract.md";
const L = readFileSync(SRC, "utf8").split("\n");

const HEADER =
  "canonical_id,name,definition,value,unit,year,source,appendix_or_section,notes";

function csv(v) {
  const s = (v ?? "").toString();
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Split "A. B. C." into sentences, keeping the trailing period off. */
function sentences(s) {
  return s
    .split(/(?<=\.)\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function stripDot(s) {
  return s.replace(/\.\s*$/, "").trim();
}

function markDuplicates(rows) {
  const seen = new Map();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) || 0) + 1);
  for (const r of rows) {
    if (seen.get(r.id) > 1) {
      r.notes = r.notes ? `DUPLICATE-IN-SOURCE; ${r.notes}` : "DUPLICATE-IN-SOURCE";
    }
  }
  return rows;
}

function emit(path, rows) {
  const body = rows
    .map((r) =>
      [r.id, r.name, r.definition, r.value, r.unit, r.year, r.source, r.section, r.notes]
        .map(csv)
        .join(",")
    )
    .join("\n");
  writeFileSync(path, HEADER + "\n" + body + "\n", "utf8");
}

// ---------- Cost Parameter Dictionary ----------
// Section runs from the "Cost Parameter Dictionary" heading to "Operational Concepts".
const cpStart = L.findIndex((l) => l.trim() === "Cost Parameter Dictionary");
const cpEnd = L.findIndex((l, i) => i > cpStart && l.trim() === "Operational Concepts");
if (cpStart < 0 || cpEnd < 0) throw new Error("CP dictionary bounds not found");

const cpRows = [];
let cpSection = "Cost Parameter Dictionary";
for (let i = cpStart + 1; i < cpEnd; i++) {
  const line = L[i].trim();
  if (!line) continue;
  // Family heading, e.g. "CP-TOT: Total System Cost Parameters" (no trailing period).
  const head = line.match(/^(CP-[A-Z]+):\s+(.+?)\s*$/);
  if (head && !/^CP-[A-Z]+-\d/.test(line) && !head[2].endsWith(".")) {
    cpSection = `Cost Parameter Dictionary > ${line}`;
    continue;
  }
  const m = line.match(/^(CP-[A-Z]+-\d+[a-z]?):\s*(.+)$/);
  if (!m) continue;
  const [, id, rest] = m;
  const parts = sentences(rest);
  let unit = "";
  const kept = [];
  for (const p of parts) {
    const u = p.match(/^Unit:\s*(.+?)\.?$/i);
    if (u) unit = u[1].trim();
    else kept.push(p);
  }
  const name = stripDot(kept.shift() || "");
  const definition = stripDot(kept.join(" "));
  cpRows.push({
    id,
    name,
    definition,
    value: "",
    unit,
    year: "",
    source: "",
    section: cpSection,
    notes: "",
  });
}

// ---------- KPP + TPP Dictionaries ----------
const kppStart = L.findIndex((l) => l.trim() === "KPP Dictionary");
const tppStart = L.findIndex((l) => l.trim() === "TPP Dictionary");
const tppEnd = L.findIndex((l, i) => i > tppStart && l.trim() === "Cost Parameter Dictionary");
if (kppStart < 0 || tppStart < 0 || tppEnd < 0) throw new Error("KPP/TPP bounds not found");

const ktRows = [];
function parseKt(from, to, section, idRe) {
  for (let i = from + 1; i < to; i++) {
    const line = L[i].trim();
    if (!line) continue;
    const m = line.match(idRe);
    if (!m) continue;
    const [, id, rest] = m;
    const parts = sentences(rest);
    let value = "";
    let domain = "";
    let trace = "";
    const kept = [];
    for (const p of parts) {
      let x;
      if ((x = p.match(/^Target\s+(.+?)\.?$/i))) value = x[1].trim();
      else if ((x = p.match(/^Domain:\s*(.+?)\.?$/i))) domain = x[1].trim();
      else if ((x = p.match(/^Trace:\s*(.+?)\.?$/i))) trace = x[1].trim();
      else kept.push(p);
    }
    const name = stripDot(kept.shift() || "");
    const definition = stripDot(kept.join(" "));
    const notes = [domain && `Domain: ${domain}`, trace && `Trace: ${trace}`]
      .filter(Boolean)
      .join("; ");
    ktRows.push({
      id,
      name,
      definition,
      value,
      unit: "",
      year: "",
      source: "",
      section,
      notes,
    });
  }
}
parseKt(kppStart, tppStart, "KPP Dictionary", /^(KPP-[A-Z0-9]+):\s*(.+)$/);
parseKt(tppStart, tppEnd, "TPP Dictionary", /^(TPP-[A-Z0-9.]+):\s*(.+)$/);

markDuplicates(cpRows);
markDuplicates(ktRows);

emit("research/cp_registry_canonical.csv", cpRows);
emit("research/kpp_tpp_registry_canonical.csv", ktRows);

const fam = (rows) => [...new Set(rows.map((r) => r.id.replace(/-[0-9.]+[a-z]?$/, "")))].sort();
console.log(`cp_registry_canonical.csv       ${cpRows.length} rows`);
console.log(`  families (${fam(cpRows).length}) ${fam(cpRows).join(", ")}`);
console.log(`  rows with a value              ${cpRows.filter((r) => r.value).length}`);
console.log(`  rows with a unit               ${cpRows.filter((r) => r.unit).length}`);
console.log(`  duplicates                     ${cpRows.filter((r) => r.notes.includes("DUPLICATE")).length}`);
console.log(`kpp_tpp_registry_canonical.csv  ${ktRows.length} rows`);
console.log(`  KPP ${ktRows.filter((r) => r.id.startsWith("KPP")).length} / TPP ${ktRows.filter((r) => r.id.startsWith("TPP")).length}`);
console.log(`  families (${fam(ktRows).length}) ${fam(ktRows).join(", ")}`);
console.log(`  rows with a target value       ${ktRows.filter((r) => r.value).length}`);
console.log(`  duplicates                     ${ktRows.filter((r) => r.notes.includes("DUPLICATE")).length}`);
