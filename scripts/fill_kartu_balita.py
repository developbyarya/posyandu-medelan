#!/usr/bin/env python3
"""Fill the "Kartu Bantu Pemeriksaan Bayi, Balita, dan Anak Pra-Sekolah" PDF.

The template is a flat (non-fillable) PDF, so we draw the text on a transparent
overlay at fixed coordinates and merge it onto the template page.

Usage:
    python scripts/fill_kartu_balita.py            # writes pdf/test/kartu_balita_test.pdf
    python scripts/fill_kartu_balita.py -o out.pdf
"""
import argparse
import io
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "pdf" / "Formulir Kartu Bantu Posyandu - Kartu Pemeriksaan Balita.pdf"
DEFAULT_OUT = ROOT / "pdf" / "test" / "kartu_balita_test.pdf"

PAGE_H = 609.4  # template page height (pt); pdf coords are bottom-up

# --------------------------------------------------------------------------
# Data
# --------------------------------------------------------------------------
HEADER = {
    # left block (identitas balita)
    "nama_balita": "Ahmad Fauzan Pratama",
    "nik": "3404012503240001",
    "jenis_kelamin": "Laki-laki",
    "tanggal_lahir": "25-03-2024",
    "bb_lahir": "3,2 kg",
    "pb_lahir": "49 cm",
    "nama_ibu": "Siti Aminah",
    "nama_ayah": "Budi Santoso",
    "alamat": "Medelan RT 02 RW 05, Umbulmartani, Ngemplak",
    "telepon": "081234567890",
    # right block (wilayah)
    "kecamatan": "Ngemplak",
    "desa": "Umbulmartani",
    "dusun": "Medelan",
    "posyandu": "Posyandu Melati",
}

# One visit = one table row. Keys are the column numbers (1-26) printed in the form.
VISIT = {
    1: "18",                       # Umur (bulan)
    2: "25-09-2025",               # Tanggal kunjungan
    3: "Lengkap",                  # Checklist perkembangan: Lengkap (hijau) / Tidak Lengkap (kuning)
    4: "10,8",                     # BB (kg)
    5: "N",                        # Berat badan naik (N) / tidak naik (T)
    6: "Normal",                   # BB/U
    7: "80,5",                     # Panjang / tinggi badan (cm)
    8: "Normal",                   # PB/U atau TB/U
    9: "Baik",                     # Status gizi (BB/TB)
    10: "47,5",                    # Lingkar kepala (cm)
    11: "Normal",                  # Status lingkar kepala
    12: "15,0",                    # LILA (cm)
    13: "Normal",                  # Status LILA
    14: "Tidak",                   # TBC: batuk terus menerus
    15: "Tidak",                   # TBC: demam >= 2 minggu
    16: "Tidak",                   # TBC: BB tidak naik 2 bulan berturut-turut
    17: "Tidak",                   # TBC: kontak erat pasien TB
    18: "Tidak",                   # ASI eksklusif
    19: "Ya, bubur",               # MP ASI (komposisi & jenis)
    20: "Campak",                  # Imunisasi
    21: "Ya",                      # Vitamin A
    22: "Tidak",                   # Obat cacing
    23: "Ya, telur & ikan",        # PMT pangan lokal
    24: "Gizi seimbang",           # Edukasi yang diberikan
    25: "Tidak",                   # Gejala sakit
    26: "Tidak",                   # Rujuk ke Pustu / Puskesmas / RS
}

# --------------------------------------------------------------------------
# Template geometry (pt, top-down from the page's upper edge) — measured from the PDF
# --------------------------------------------------------------------------
# Header fields: (x of the line start, text baseline y, max width)
LEFT_X, LEFT_W = 118.0, 154.0
RIGHT_X, RIGHT_W = 824.0, 94.0
HEADER_POS = {
    "nama_balita": (LEFT_X, 62.5, LEFT_W),
    "nik": (LEFT_X, 74.1, LEFT_W),
    "jenis_kelamin": (LEFT_X, 85.7, LEFT_W),
    "tanggal_lahir": (LEFT_X, 97.3, LEFT_W),
    "bb_lahir": (LEFT_X, 108.9, LEFT_W),
    "pb_lahir": (LEFT_X, 120.5, LEFT_W),
    "nama_ibu": (LEFT_X, 132.1, LEFT_W),
    "nama_ayah": (LEFT_X, 143.7, LEFT_W),
    "alamat": (LEFT_X, 155.3, LEFT_W),
    "telepon": (LEFT_X, 166.9, LEFT_W),
    "kecamatan": (RIGHT_X, 74.1, RIGHT_W),
    "desa": (RIGHT_X, 85.7, RIGHT_W),
    "dusun": (RIGHT_X, 97.3, RIGHT_W),
    "posyandu": (RIGHT_X, 108.9, RIGHT_W),
}

# Vertical borders of the 26 table columns (27 values)
COL_X = [16.0, 40.6, 79.0, 117.3, 148.3, 179.2, 210.3, 241.3, 272.4, 303.3,
         334.3, 365.3, 396.3, 427.3, 458.2, 489.3, 520.3, 551.3, 582.7, 614.2,
         645.8, 677.3, 708.8, 757.0, 823.2, 889.4, 918.6]
FIRST_ROW_TOP = 316.5   # top edge of the first data row (page 1)
ROW_H = 14.4
ROWS_PAGE_1 = 18

GREEN = (0.78, 0.94, 0.78)   # Lengkap
YELLOW = (1.0, 0.95, 0.6)    # Tidak lengkap

FONT = "Helvetica"


# --------------------------------------------------------------------------
# Drawing helpers
# --------------------------------------------------------------------------
def draw_fit_line(c, text, x, baseline, max_w, size=8.0, min_size=5.0):
    """Draw a single line, shrinking the font until it fits max_w."""
    while size > min_size and stringWidth(text, FONT, size) > max_w:
        size -= 0.25
    c.setFont(FONT, size)
    c.drawString(x, PAGE_H - baseline, text)


def draw_cell(c, text, col, row, max_lines=2, size=6.0, min_size=3.8):
    """Center `text` inside table cell (col 1-26, row 0-based), wrapping/shrinking to fit."""
    x0, x1 = COL_X[col - 1], COL_X[col]
    top = FIRST_ROW_TOP + row * ROW_H
    pad = 1.5
    avail_w = (x1 - x0) - 2 * pad

    lines, line_h = [text], 0
    while True:
        lines = simpleSplit(text, FONT, size, avail_w)
        line_h = size * 1.1
        fits = len(lines) <= max_lines and line_h * len(lines) <= ROW_H - 2
        if fits or size <= min_size:
            break
        size -= 0.2

    block_h = line_h * len(lines)
    y = top + (ROW_H - block_h) / 2 + size * 0.85  # first baseline (top-down)
    c.setFont(FONT, size)
    cx = (x0 + x1) / 2
    for ln in lines:
        c.drawCentredString(cx, PAGE_H - y, ln)
        y += line_h


def shade_cell(c, col, row, rgb):
    x0, x1 = COL_X[col - 1], COL_X[col]
    top = FIRST_ROW_TOP + row * ROW_H
    c.setFillColorRGB(*rgb)
    c.rect(x0, PAGE_H - (top + ROW_H), x1 - x0, ROW_H, stroke=0, fill=1)
    c.setFillColorRGB(0, 0, 0)


def build_overlay(header, visits):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(935.4, PAGE_H))

    # Cell shading first, so the text goes on top
    for row, visit in enumerate(visits):
        if 3 in visit:
            lengkap = not visit[3].lower().startswith("tidak")
            shade_cell(c, 3, row, GREEN if lengkap else YELLOW)

    c.setFillColorRGB(0, 0, 0)
    for key, value in header.items():
        x, baseline, w = HEADER_POS[key]
        draw_fit_line(c, str(value), x, baseline, w)

    for row, visit in enumerate(visits):
        if row >= ROWS_PAGE_1:
            raise ValueError("Only the first page's rows are supported by this script")
        for col, value in visit.items():
            draw_cell(c, str(value), col, row)

    c.save()
    buf.seek(0)
    return buf


def fill(output, header=HEADER, visits=None):
    visits = visits if visits is not None else [VISIT]
    overlay = PdfReader(build_overlay(header, visits)).pages[0]

    reader = PdfReader(str(TEMPLATE))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        if i == 0:
            page.merge_page(overlay)
        writer.add_page(page)

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "wb") as f:
        writer.write(f)
    return output


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-o", "--output", default=str(DEFAULT_OUT))
    args = ap.parse_args()
    print(f"Saved: {fill(args.output)}")
