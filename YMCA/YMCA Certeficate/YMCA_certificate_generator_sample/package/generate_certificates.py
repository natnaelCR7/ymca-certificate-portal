#!/usr/bin/env python3
"""Generate YMCA certificates from CSV sources and a PDF template."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import uuid
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterable

import qrcode
from pypdf import PdfReader, PdfWriter
from qrcode.exceptions import DataOverflowError
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

PAGE_W, PAGE_H = 842, 595

DEFAULT_VERIFY_BASE = "https://verify.example.org/c"

FONT_NAME = "CertSans"
FONT_NAME_BOLD = "CertSansBold"

DEFAULT_LAYOUT = {
    "participant_name": {
        "x": 168,
        "y": 322,
        "width": 506,
        "height": 44,
        "alignment": "center",
        "font": "bold",
        "max_size": 27,
        "min_size": 17,
        "color": [10, 23, 41],
    },
    "course": {
        "x": 240,
        "y": 157,
        "width": 362,
        "height": 34,
        "alignment": "center",
        "font": "bold",
        "max_size": 17,
        "min_size": 11,
        "color": [10, 23, 41],
    },
    "qr": {
        "x": 736,
        "y": 206,
        "size": 56,
    },
}


@dataclass(frozen=True)
class BoxTextResult:
    font_size: float
    x: float
    y: float
    width: float
    height: float


def slugify_course(filename: str) -> str:
    name = filename.lower()
    name = re.sub(r"^certified[-_ ]*", "", name)
    name = re.sub(r"\.csv$", "", name)
    name = name.strip(" _-")
    aliases = {
        "digital marketing": "Digital Marketing",
        "french": "French",
        "personal leadership": "Personal Leadership",
        "project mgt": "Project Management",
        "project management": "Project Management",
        "spanish": "Spanish",
        "chinees": "Chinese",
        "chinese": "Chinese",
        "english": "English",
        "it&ai": "IT & AI",
        "it & ai": "IT & AI",
    }
    return aliases.get(name, name.title())


def clean_name(value: str) -> str:
    return " ".join(value.strip().split())


def load_layout(path: Path | None) -> dict:
    if not path:
        return DEFAULT_LAYOUT
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def register_fonts(font_dir: Path) -> None:
    regular = font_dir / "DejaVuSans.ttf"
    bold = font_dir / "DejaVuSans-Bold.ttf"
    if not regular.exists() or not bold.exists():
        raise SystemExit(f"Missing fonts in {font_dir}")
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(regular)))
    pdfmetrics.registerFont(TTFont(FONT_NAME_BOLD, str(bold)))


def font_for(spec: dict) -> str:
    return FONT_NAME_BOLD if spec.get("font", "bold") == "bold" else FONT_NAME


def fit_text(text: str, font_name: str, box: dict) -> BoxTextResult:
    max_size = float(box["max_size"])
    min_size = float(box["min_size"])
    width = float(box["width"])
    height = float(box["height"])
    x = float(box["x"])
    y = float(box["y"])

    size = max_size
    while size >= min_size:
        text_width = pdfmetrics.stringWidth(text, font_name, size)
        ascent = pdfmetrics.getAscent(font_name, size)
        descent = abs(pdfmetrics.getDescent(font_name, size))
        text_height = ascent + descent
        if text_width <= width and text_height <= height:
            start_x = x + (width - text_width) / 2 if box.get("alignment", "center") == "center" else x
            baseline_y = y + (height - text_height) / 2 + descent
            return BoxTextResult(size, start_x, baseline_y, text_width, text_height)
        size -= 0.5
    raise ValueError(f'"{text}" does not fit in the configured box')


def detect_pdf_text_conflict(text: str, box: dict) -> None:
    # Safety guard: catch layout regressions before emitting a bad PDF.
    result = fit_text(text, font_for(box), box)
    if result.width > box["width"] + 0.01 or result.height > box["height"] + 0.01:
        raise ValueError(f'Text "{text}" exceeds its bounding box')


def read_participants(input_dir: Path) -> tuple[list[dict], list[dict]]:
    rows: list[dict] = []
    duplicates: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for csv_path in sorted(input_dir.glob("*.csv")):
        course = slugify_course(csv_path.name)
        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            for line_no, line in enumerate(f, 1):
                name = clean_name(line)
                if not name:
                    continue
                if name.casefold() in {"morning class"}:
                    continue
                key = (name.casefold(), course.casefold())
                if key in seen:
                    duplicates.append({
                        "name": name,
                        "course": course,
                        "source_file": csv_path.name,
                        "line": line_no,
                    })
                    continue
                seen.add(key)
                rows.append({"name": name, "course": course, "source_file": csv_path.name, "line": line_no})
    return rows, duplicates


def certificate_id_for(name: str, course: str, source_file: str, line_no: int) -> str:
    seed = f"{name.casefold()}|{course.casefold()}|{source_file.casefold()}|{line_no}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return str(uuid.UUID(digest[:32]))


def make_qr(url: str) -> BytesIO:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def create_overlay(name: str, course: str, certificate_id: str, verify_base: str, layout: dict) -> BytesIO:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))

    name_box = layout["participant_name"]
    course_box = layout["course"]
    qr_box = layout["qr"]

    name_fit = fit_text(name, font_for(name_box), name_box)
    course_fit = fit_text(course, font_for(course_box), course_box)

    c.setFillColorRGB(*(v / 255.0 for v in name_box.get("color", [10, 23, 41])))
    c.setFont(font_for(name_box), name_fit.font_size)
    c.drawString(name_fit.x, name_fit.y, name)

    c.setFillColorRGB(*(v / 255.0 for v in course_box.get("color", [10, 23, 41])))
    c.setFont(font_for(course_box), course_fit.font_size)
    c.drawString(course_fit.x, course_fit.y, course)

    url = f"{verify_base.rstrip('/')}/{certificate_id}"
    qr_buf = make_qr(url)
    c.drawImage(
        ImageReader(qr_buf),
        qr_box["x"],
        qr_box["y"],
        width=qr_box["size"],
        height=qr_box["size"],
        preserveAspectRatio=True,
        mask="auto",
    )

    c.save()
    buf.seek(0)
    return buf


def merge(template: Path, overlay: BytesIO, output: Path) -> None:
    base = PdfReader(str(template))
    over = PdfReader(overlay)
    page = base.pages[0]
    page.merge_page(over.pages[0])
    writer = PdfWriter()
    writer.add_page(page)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as f:
        writer.write(f)


def validate_generated_row(row: dict, layout: dict, verify_base: str) -> None:
    # Fails fast if any configured field cannot be rendered safely.
    for key, box in (("name", layout["participant_name"]), ("course", layout["course"])):
        detect_pdf_text_conflict(row[key], box)
    if not verify_base:
        raise ValueError("Verification base URL is required")


def write_registry(path: Path, rows: Iterable[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["certificate_id", "participant_name", "course", "verification_url", "status", "source_file", "source_line"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", type=Path, default=Path("Certified.pdf"))
    parser.add_argument("--participants", type=Path, default=Path("certified_participants"))
    parser.add_argument("--output", type=Path, default=Path("generated_certificates"))
    parser.add_argument("--limit", type=int, default=3, help="Generate only the first N certificates; 0 means all")
    parser.add_argument("--verify-base", default=DEFAULT_VERIFY_BASE)
    parser.add_argument("--layout", type=Path, default=None)
    parser.add_argument("--font-dir", type=Path, default=Path(__file__).resolve().parent / "fonts")
    args = parser.parse_args()

    if not args.template.exists():
        raise SystemExit(f"Template not found: {args.template}")
    if not args.participants.exists():
        raise SystemExit(f"Participant directory not found: {args.participants}")

    register_fonts(args.font_dir)
    layout = load_layout(args.layout)

    rows, duplicates = read_participants(args.participants)
    selected = rows if args.limit == 0 else rows[: args.limit]

    args.output.mkdir(parents=True, exist_ok=True)
    registry_rows: list[dict] = []

    for row in selected:
        validate_generated_row(row, layout, args.verify_base)
        cert_id = certificate_id_for(row["name"], row["course"], row["source_file"], row["line"])
        verification_url = f"{args.verify_base.rstrip('/')}/{cert_id}"
        safe_name = re.sub(r"[^A-Za-z0-9._ -]+", "", row["name"]).strip().replace(" ", "_") or "participant"
        safe_course = re.sub(r"[^A-Za-z0-9& -]+", "", row["course"]).strip().replace(" ", "_") or "course"
        output_file = args.output / safe_course / f"{safe_name}.pdf"
        overlay = create_overlay(row["name"], row["course"], cert_id, args.verify_base, layout)
        merge(args.template, overlay, output_file)
        registry_rows.append({
            "certificate_id": cert_id,
            "participant_name": row["name"],
            "course": row["course"],
            "verification_url": verification_url,
            "status": "valid",
            "source_file": row["source_file"],
            "source_line": row["line"],
        })
        print(f"Generated: {output_file}")

    write_registry(args.output / "certificate_registry.csv", registry_rows)

    if duplicates:
        dup_path = args.output / "duplicates_report.csv"
        with dup_path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["name", "course", "source_file", "line"])
            writer.writeheader()
            writer.writerows(duplicates)
        print(f"Duplicate records reported: {dup_path}")

    print(f"Generated {len(selected)} certificate(s). Registry: {args.output / 'certificate_registry.csv'}")


if __name__ == "__main__":
    main()
