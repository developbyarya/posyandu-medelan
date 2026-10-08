import type { Balita, KunjunganILP } from '../../db/types';
import { WILAYAH } from '../../config/wilayah';
import * as layout from './layout';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatFloat(num: number | undefined): string {
  if (num === undefined) return '-';
  return num.toString().replace('.', ',');
}

function boolToYaTidak(val: boolean | undefined): string {
  if (val === undefined) return '-';
  return val ? 'Ya' : 'Tidak';
}

function getVisitRow(v: KunjunganILP): Record<number, string> {
  return {
    1: v.umur_bulan?.toString() || '-',
    2: formatDate(v.tanggal_kunjungan),
    3: v.checklist_perkembangan === 'Lengkap' ? 'Lengkap' : 'Tidak Lengkap',
    4: formatFloat(v.bb),
    5: v.status_kenaikan_bb || '-',
    6: v.status_bbu || '-',
    7: formatFloat(v.tb),
    8: v.status_tbu || '-',
    9: v.status_bbtb || '-',
    10: formatFloat(v.lingkar_kepala),
    11: v.status_lk || '-',
    12: formatFloat(v.lila),
    13: v.status_lila || '-',
    14: boolToYaTidak(v.tbc_batuk),
    15: boolToYaTidak(v.tbc_demam),
    16: boolToYaTidak(v.tbc_bb_tidak_naik),
    17: boolToYaTidak(v.tbc_kontak),
    18: boolToYaTidak(v.asi_eksklusif),
    19: v.mpasi || '-',
    20: v.imunisasi || '-',
    21: boolToYaTidak(v.vitamin_a),
    22: boolToYaTidak(v.obat_cacing),
    23: v.pmt_diterima || '-',
    24: v.edukasi || '-',
    25: v.ada_gejala_sakit || '-',
    26: boolToYaTidak(v.rujuk_puskesmas),
  };
}

export async function generateKartuPdf(balita: Balita, visits: KunjunganILP[]): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  
  // Load template
  const url = '/pdf/template_kartu_balita.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2Template = pages.length > 1 ? pages[1] : null; // According to PRD there's a page 2

  // Header mapping
  const headerData: Record<string, string> = {
    nama_balita: balita.nama_balita,
    nik: balita.nik || '-',
    jenis_kelamin: balita.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
    tanggal_lahir: formatDate(balita.tanggal_lahir),
    bb_lahir: `${formatFloat(balita.bb_lahir)} kg`,
    pb_lahir: `${formatFloat(balita.pb_lahir)} cm`,
    nama_ibu: balita.nama_ortu || (balita as any).nama_ibu || '-',
    nama_ayah: (balita as any).nama_ayah || '-',
    alamat: `Medelan RT ${balita.alamat_rt}, ${WILAYAH.desa}, ${WILAYAH.kecamatan}`,
    telepon: balita.telepon || '-',
    kecamatan: WILAYAH.kecamatan,
    desa: WILAYAH.desa,
    dusun: balita.dusun,
    posyandu: balita.posyandu,
  };

  function drawFitLine(page: any, text: string, x: number, baseline: number, maxW: number, size = 8.0, minSize = 5.0) {
    let currentSize = size;
    while (currentSize > minSize && font.widthOfTextAtSize(text, currentSize) > maxW) {
      currentSize -= 0.25;
    }
    page.drawText(text, {
      x,
      y: layout.PAGE_H - baseline,
      size: currentSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  function simpleSplit(text: string, size: number, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      if (font.widthOfTextAtSize(testLine, size) <= maxW) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word || '';
      }
    }
    lines.push(currentLine);
    return lines;
  }

  function drawCell(page: any, text: string, col: number, rowIdx: number, isPage2: boolean, maxLines = 2, size = 6.0, minSize = 3.8) {
    const x0 = layout.COL_X[col - 1]!;
    const x1 = layout.COL_X[col]!;
    const top = isPage2 
      ? layout.P2_FIRST_ROW_TOP + rowIdx * layout.ROW_H 
      : layout.FIRST_ROW_TOP + rowIdx * layout.ROW_H;
      
    const pad = 1.5;
    const availW = (x1 - x0) - 2 * pad;

    let currentSize = size;
    let lines: string[] = [text];
    let lineH = 0;

    while (true) {
      lines = simpleSplit(text, currentSize, availW);
      lineH = currentSize * 1.1;
      const fits = lines.length <= maxLines && lineH * lines.length <= layout.ROW_H - 2;
      if (fits || currentSize <= minSize) break;
      currentSize -= 0.2;
    }

    const blockH = lineH * lines.length;
    let y = top + (layout.ROW_H - blockH) / 2 + currentSize * 0.85;
    const cx = (x0 + x1) / 2;

    for (const ln of lines) {
      const w = font.widthOfTextAtSize(ln, currentSize);
      page.drawText(ln, {
        x: cx - w / 2,
        y: layout.PAGE_H - y,
        size: currentSize,
        font,
        color: rgb(0, 0, 0),
      });
      y += lineH;
    }
  }

  function shadeCell(page: any, col: number, rowIdx: number, isPage2: boolean, r: number, g: number, b: number) {
    const x0 = layout.COL_X[col - 1]!;
    const x1 = layout.COL_X[col]!;
    const top = isPage2 
      ? layout.P2_FIRST_ROW_TOP + rowIdx * layout.ROW_H 
      : layout.FIRST_ROW_TOP + rowIdx * layout.ROW_H;
      
    page.drawRectangle({
      x: x0,
      y: layout.PAGE_H - (top + layout.ROW_H),
      width: x1 - x0,
      height: layout.ROW_H,
      color: rgb(r, g, b),
      borderWidth: 0,
    });
  }

  // 1. Draw header on Page 1
  for (const [key, value] of Object.entries(headerData)) {
    const pos = layout.HEADER_POS[key];
    if (pos) {
      drawFitLine(page1, String(value), pos.x, pos.baseline, pos.w);
    }
  }

  // 2. Draw visits
  // Sort visits chronologically
  const sortedVisits = [...visits].sort((a, b) => a.tanggal_kunjungan.localeCompare(b.tanggal_kunjungan));
  
  let currentPageIdx = 0;
  let rowIdxOnPage = 0;
  let currentPage = page1;
  let isPage2 = false;

  for (const visit of sortedVisits) {
    if (currentPageIdx === 0 && rowIdxOnPage >= layout.ROWS_PAGE_1) {
      currentPageIdx = 1;
      rowIdxOnPage = 0;
      isPage2 = true;
      currentPage = page2Template!;
    } else if (currentPageIdx >= 1 && rowIdxOnPage >= layout.P2_ROWS) {
      currentPageIdx++;
      rowIdxOnPage = 0;
      // Copy page2Template and append it
      const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [1]);
      pdfDoc.addPage(copiedPage);
      currentPage = copiedPage;
    }

    const rowData = getVisitRow(visit);

    // Draw background shading first
    const lengkapText = rowData[3] || '';
    const isLengkap = lengkapText.toLowerCase().startsWith('lengkap');
    const color = isLengkap ? layout.COLOR_GREEN : layout.COLOR_YELLOW;
    shadeCell(currentPage, 3, rowIdxOnPage, isPage2, color.r, color.g, color.b);

    // Draw text for all columns
    for (const [col, value] of Object.entries(rowData)) {
      drawCell(currentPage, value, Number(col), rowIdxOnPage, isPage2);
    }

    rowIdxOnPage++;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
