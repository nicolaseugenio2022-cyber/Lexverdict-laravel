#!/usr/bin/env python3
"""Validate the M7 Case Report PDF's structure and visible page bounds."""

from __future__ import annotations

import sys
from pathlib import Path

import fitz


REQUIRED_TEXT = (
    "LEXVERDICT - CASE REPORT",
    "SUMMARY",
    "TOTAL CASES:",
    "CASES FILED:",
    "CASES DISMISSED:",
    "CRIME DISTRIBUTION",
    "VERDICT BREAKDOWN",
    "SEX BREAKDOWN",
    "AGE GROUP BREAKDOWN",
    "TOP POLICE STATIONS",
)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: validate_case_report_pdf.py REPORT.pdf")

    path = Path(sys.argv[1])
    if not path.is_file():
        raise AssertionError("Case Report PDF does not exist")

    with fitz.open(path) as document:
        if len(document) < 1:
            raise AssertionError("Case Report PDF has no pages")

        text = "\n".join(page.get_text().upper() for page in document)
        for required in REQUIRED_TEXT:
            if required not in text:
                raise AssertionError(f"missing report text: {required}")

        for number, page in enumerate(document, start=1):
            if abs(page.rect.width - 841.89) > 1 or abs(page.rect.height - 595.28) > 1:
                raise AssertionError(f"page {number} is not A4 landscape")

            for block in page.get_text("blocks"):
                x0, y0, x1, y1 = block[:4]
                if x0 < -1 or y0 < -1 or x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
                    raise AssertionError(f"page {number} contains clipped text")

    print("Case Report PDF structure and visible bounds are valid.")


if __name__ == "__main__":
    main()
