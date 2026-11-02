#!/usr/bin/env python3
"""Assemble index.html from src/index.template.html.

Every line of the form  <!-- @include path/to/file.html -->  is replaced by the
contents of src/partials/<path>. Includes can be nested.

Usage:  python3 build.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTIALS = ROOT / "src" / "partials"
TEMPLATE = ROOT / "src" / "index.template.html"
OUTPUT = ROOT / "index.html"
INCLUDE = re.compile(r"^\s*<!--\s*@include\s+(\S+)\s*-->\s*$")


def render(text, stack=()):
    out = []
    for line in text.split("\n"):
        match = INCLUDE.match(line)
        if not match:
            out.append(line)
            continue
        name = match.group(1)
        if name in stack:
            sys.exit("Circular include: " + " -> ".join(stack + (name,)))
        path = PARTIALS / name
        if not path.is_file():
            sys.exit("Missing partial: " + str(path))
        partial = path.read_text(encoding="utf-8").rstrip("\n")
        out.append(render(partial, stack + (name,)))
    return "\n".join(out)


if __name__ == "__main__":
    html = render(TEMPLATE.read_text(encoding="utf-8"))
    OUTPUT.write_text(html, encoding="utf-8")
    print("Wrote", OUTPUT)
