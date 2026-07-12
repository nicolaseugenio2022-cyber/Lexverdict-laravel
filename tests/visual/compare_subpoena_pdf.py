#!/usr/bin/env python3
"""Compare the Laravel subpoena PDF with the owner-approved legacy baseline."""

from __future__ import annotations

import sys
from pathlib import Path

import fitz


PAGE_SIZE = (612.0, 936.0)
POSITION_TOLERANCE = 24.0
IMAGE_TOLERANCE = 1.0
ANCHORS = (
    "DEPARTMENT OF JUSTICE",
    "The Chief of Police",
    "Under and by virtue",
    "FAIL NOT UNDER",
    "WITNESS MY HAND",
    "HON. RAMON PROSECUTOR",
    "Return:",
    "Server:",
    "To view this case online",
)


def fail(message: str) -> None:
    raise AssertionError(message)


def visible_image_rectangles(page: fitz.Page) -> list[fitz.Rect]:
    rectangles: list[fitz.Rect] = []

    for image in page.get_images(full=True):
        for rectangle in page.get_image_rects(image[0]):
            if not any(rectangle == existing for existing in rectangles):
                rectangles.append(rectangle)

    return sorted(rectangles, key=lambda rectangle: (round(rectangle.y0, 1), rectangle.x0))


def assert_close(actual: float, expected: float, tolerance: float, label: str) -> None:
    if abs(actual - expected) > tolerance:
        fail(f"{label}: expected {expected:.2f}, got {actual:.2f}")


def compare_page(baseline: fitz.Page, current: fitz.Page, page_number: int) -> None:
    for dimension, actual, expected in zip(
        ("width", "height"),
        (current.rect.width, current.rect.height),
        PAGE_SIZE,
        strict=True,
    ):
        assert_close(actual, expected, 0.1, f"page {page_number} {dimension}")

    baseline_images = visible_image_rectangles(baseline)
    current_images = visible_image_rectangles(current)
    if len(baseline_images) != 2 or len(current_images) != 2:
        fail(f"page {page_number}: expected two approved header images")

    for image_number, (expected, actual) in enumerate(
        zip(baseline_images, current_images, strict=True), start=1
    ):
        for coordinate in ("x0", "y0", "x1", "y1"):
            assert_close(
                getattr(actual, coordinate),
                getattr(expected, coordinate),
                IMAGE_TOLERANCE,
                f"page {page_number} image {image_number} {coordinate}",
            )

    for anchor in ANCHORS:
        expected_hits = baseline.search_for(anchor)
        actual_hits = current.search_for(anchor)
        if len(expected_hits) != 1 or len(actual_hits) != 1:
            fail(
                f"page {page_number}: anchor {anchor!r} must occur exactly once "
                "in both documents"
            )

        expected = expected_hits[0]
        actual = actual_hits[0]
        assert_close(
            actual.x0,
            expected.x0,
            POSITION_TOLERANCE,
            f"page {page_number} anchor {anchor!r} x",
        )
        assert_close(
            actual.y0,
            expected.y0,
            POSITION_TOLERANCE,
            f"page {page_number} anchor {anchor!r} y",
        )

    return_y = current.search_for("Return:")[0].y0
    footer_y = current.search_for("To view this case online")[0].y0
    if return_y >= 800 or footer_y <= 850 or footer_y - return_y < 80:
        fail(f"page {page_number}: return section and PIN footer overlap")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: compare_subpoena_pdf.py BASELINE CURRENT")

    baseline_path, current_path = map(Path, sys.argv[1:])
    if not baseline_path.is_file() or not current_path.is_file():
        fail("baseline and current PDF files must exist")

    with fitz.open(baseline_path) as baseline, fitz.open(current_path) as current:
        if len(baseline) != 2 or len(current) != 2:
            fail("the approved subpoena must contain exactly two pages")

        for page_number, (baseline_page, current_page) in enumerate(
            zip(baseline, current, strict=True), start=1
        ):
            compare_page(baseline_page, current_page, page_number)

    print("Subpoena PDF matches the approved legacy visual baseline.")


if __name__ == "__main__":
    main()
