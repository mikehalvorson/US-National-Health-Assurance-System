#!/usr/bin/env node
/**
 * Extract a .docx to greppable, diffable text WITHOUT losing table structure.
 *
 * Usage:  node tools/extract_docx.mjs <input.docx> <output.md>
 * Node stdlib only (zlib + fs). No npm install, no Python.
 *
 * R131 [S2]: this began as a port of tools/extract_docx.py, which was committed
 * having never been run, so nothing had ever checked the port against its
 * original. Running both on all three .docx files in the repo settled it: the
 * content is byte for byte identical, and the only divergence is line endings -
 * Python's text-mode write translates 
 to 
 on Windows, this writes 
.
 * On the framework document that is 1,614,507 bytes against 1,598,905, equal
 * after normalising newlines; the identifier, line and table-row counts agree
 * exactly on every file. The Python original is deleted rather than kept as a
 * second implementation of one job: package.json pins Node 22 through Volta, so
 * Node is the runtime the repo can assume. The two generators that need
 * python-docx remain Python; which runtime each tool needs is declared in
 * src/lib/toolchain-check.ts and gated by a self-test.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const CELL = "\x00CELL\x00";
const ROW = "\x00ROW\x00";

/** Minimal ZIP reader: central directory walk, stored or deflated members. */
function readZip(path) {
  const buf = readFileSync(path);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`not a zip file: ${path}`);
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const members = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("bad central directory");
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    members.set(name, method === 0 ? raw : inflateRawSync(raw));
    off += 46 + nameLen + extraLen + commentLen;
  }
  return members;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
function unescapeHtml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, ref) => {
    if (ref[0] === "#") {
      const cp = ref[1] === "x" || ref[1] === "X"
        ? parseInt(ref.slice(2), 16)
        : parseInt(ref.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    const lower = ref.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, lower) ? ENTITIES[lower] : m;
  });
}

function xmlToText(xml) {
  // Structure markers must be inserted BEFORE tags are stripped.
  xml = xml.replace(/<w:br[^>]*\/>/g, "\n");
  xml = xml.replace(/<w:tab[^>]*\/>/g, "\t");
  xml = xml.replace(/<\/w:p>/g, "\n");
  xml = xml.replace(/<\/w:tc>/g, CELL);
  xml = xml.replace(/<w:tr[ >]/g, ROW + "$&"); // close the preceding paragraph
  xml = xml.replace(/<\/w:tr>/g, ROW);
  let text = xml.replace(/<[^>]+>/g, "");
  text = unescapeHtml(text);

  // Rebuild tables as pipe-delimited rows.
  const out = [];
  for (const row of text.split(ROW)) {
    if (row.includes(CELL)) {
      const cells = row.split(CELL).map((c) => c.replace(/\n/g, " ").trim());
      if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
      out.push("| " + cells.join(" | ") + " |");
    } else {
      out.push(row);
    }
  }
  text = out.join("\n");

  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim() + "\n";
}

function main(src, out) {
  const zip = readZip(src);
  const parts = [];
  const missing = [];
  for (const [member, label] of [
    ["word/document.xml", null],
    ["word/footnotes.xml", "FOOTNOTES"],
    ["word/endnotes.xml", "ENDNOTES"],
  ]) {
    if (!zip.has(member)) { missing.push(member); continue; }
    let body = xmlToText(zip.get(member).toString("utf8"));
    if (label) body = `\n\n---\n\n# ${label}\n\n${body}`;
    parts.push(body);
  }

  const text = parts.join("");
  writeFileSync(out, text, "utf8");

  const ids = text.match(/\b(?:CP|KPP|TPP|ASM|SR|PR|OI)-[A-Z0-9]+(?:-[0-9]+[a-z]?)?/g) || [];
  const uniq = [...new Set(ids)].sort();
  const fams = [...new Set(uniq.map((i) => i.slice(0, i.lastIndexOf("-"))))].sort();
  const n = (v) => v.toLocaleString("en-US");
  const lines = (text.match(/\n/g) || []).length;
  const rows = (text.match(/\|\n/g) || []).length;
  console.log(`wrote ${out}`);
  console.log(`  chars           ${n(text.length)}`);
  console.log(`  lines           ${n(lines)}`);
  console.log(`  table rows      ${n(rows)}`);
  console.log(`  identifiers     ${n(ids.length)} total / ${n(uniq.length)} unique`);
  console.log(`  families (${fams.length}) ${fams.join(", ")}`);
  if (missing.length) console.log(`  absent parts    ${missing.join(", ")}`);
  if (!uniq.length) {
    console.log("  !! NO CP-/KPP-/TPP- IDENTIFIERS FOUND - stop and inspect before continuing.");
  }
}

const [, , src, out] = process.argv;
if (!src || !out) {
  console.error("Usage: node tools/extract_docx.mjs <input.docx> <output.md>");
  process.exit(1);
}
main(src, out);
