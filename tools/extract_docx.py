#!/usr/bin/env python3
"""Extract a .docx to greppable, diffable text WITHOUT losing table structure.

Usage:  python tools/extract_docx.py <input.docx> <output.md>
Stdlib only. No pip install.
"""
import html
import re
import sys
import zipfile

CELL = "\x00CELL\x00"
ROW = "\x00ROW\x00"


def xml_to_text(xml: str) -> str:
    # Structure markers must be inserted BEFORE tags are stripped.
    xml = re.sub(r"<w:br[^>]*/>", "\n", xml)
    xml = re.sub(r"<w:tab[^>]*/>", "\t", xml)
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"</w:tc>", CELL, xml)
    xml = re.sub(r"<w:tr[ >]", ROW + r"\g<0>", xml)  # close the preceding paragraph
    xml = re.sub(r"</w:tr>", ROW, xml)
    text = re.sub(r"<[^>]+>", "", xml)
    text = html.unescape(text)

    # Rebuild tables as pipe-delimited rows.
    out = []
    for row in text.split(ROW):
        if CELL in row:
            cells = [c.replace("\n", " ").strip() for c in row.split(CELL)]
            if cells and cells[-1].strip() == "":
                cells.pop()
            out.append("| " + " | ".join(cells) + " |")
        else:
            out.append(row)
    text = "\n".join(out)

    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def main(src: str, out: str) -> None:
    parts, missing = [], []
    with zipfile.ZipFile(src) as z:
        names = set(z.namelist())
        for member, label in [
            ("word/document.xml", None),
            ("word/footnotes.xml", "FOOTNOTES"),
            ("word/endnotes.xml", "ENDNOTES"),
        ]:
            if member not in names:
                missing.append(member)
                continue
            body = xml_to_text(z.read(member).decode("utf-8", "replace"))
            if label:
                body = f"\n\n---\n\n# {label}\n\n{body}"
            parts.append(body)

    text = "".join(parts)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(text)

    ids = re.findall(r"\b((?:CP|KPP|TPP|ASM|SR|PR|OI)-[A-Z0-9]+(?:-[0-9]+[a-z]?)?)", text)
    uniq = sorted(set(ids))
    fams = sorted({i.rsplit("-", 1)[0] for i in uniq})
    print(f"wrote {out}")
    print(f"  chars           {len(text):,}")
    print(f"  lines           {text.count(chr(10)):,}")
    print(f"  table rows      {text.count('|' + chr(10)):,}")
    print(f"  identifiers     {len(ids):,} total / {len(uniq):,} unique")
    print(f"  families ({len(fams)}) {', '.join(fams)}")
    if missing:
        print(f"  absent parts    {', '.join(missing)}")
    if not uniq:
        print("  !! NO CP-/KPP-/TPP- IDENTIFIERS FOUND — stop and inspect before continuing.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
