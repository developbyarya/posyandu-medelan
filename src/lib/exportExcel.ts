import * as XLSX from 'xlsx';
import { db } from '../db/db';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export async function exportToExcel() {
  const balitaList = await db.balita.filter(b => !b.deleted_at && !b.is_pindah).toArray();
  const activeUuids = new Set(balitaList.map(b => b.local_uuid));
  const allVisits = await db.kunjungan.toArray();
  const visits = allVisits.filter(v => activeUuids.has(v.balita_uuid));

  // Extract all unique YYYY-MM
  const monthSet = new Set<string>();
  for (const v of visits) {
    if (v.tanggal_kunjungan) {
      monthSet.add(v.tanggal_kunjungan.substring(0, 7)); // YYYY-MM
    }
  }
  const uniqueMonths = Array.from(monthSet).sort();

  // Prepare header rows
  const headerRow1: any[] = ['', '', '', ''];
  const headerRow2: any[] = ['No', 'Nama Balita', 'Nama Orang Tua', 'Tanggal Lahir'];
  const merges: XLSX.Range[] = [];

  let currentYear = '';
  let yearStartCol = 4; // Start after No, Nama, Ortu, Tgl Lahir

  uniqueMonths.forEach((ym, i) => {
    const [year, monthStr] = ym.split('-');
    const monthName = MONTH_NAMES[parseInt(monthStr, 10) - 1];

    if (currentYear !== year) {
      if (currentYear !== '') {
        merges.push({
          s: { r: 0, c: yearStartCol },
          e: { r: 0, c: headerRow1.length - 1 }
        });
      }
      currentYear = year;
      yearStartCol = headerRow1.length;
    }

    const cols = [`${monthName} BB`, `${monthName} TB`, `${monthName} LK`, `${monthName} LiLA`, `${monthName} Gizi`, `${monthName} Tren`];
    
    // Add year label at the start of the year block
    headerRow1.push(year, ...Array(cols.length - 1).fill(''));
    headerRow2.push(...cols);
  });

  // Close the last year merge
  if (currentYear !== '') {
    merges.push({
      s: { r: 0, c: yearStartCol },
      e: { r: 0, c: headerRow1.length - 1 }
    });
  }

  // Sort balita alphabetically
  balitaList.sort((a, b) => a.nama_balita.localeCompare(b.nama_balita));

  const dataRows = balitaList.map((balita, index) => {
    const row: any[] = [
      index + 1,
      balita.nama_balita,
      balita.nama_ortu || '',
      balita.tanggal_lahir
    ];

    const balitaVisits = visits.filter(v => v.balita_uuid === balita.local_uuid);
    const visitMap = new Map(balitaVisits.map(v => [v.tanggal_kunjungan.substring(0, 7), v]));

    uniqueMonths.forEach(ym => {
      const v = visitMap.get(ym);
      if (v) {
        row.push(
          v.bb ?? '',
          v.tb ?? '',
          v.lingkar_kepala ?? '',
          v.lila ?? '',
          v.status_bbtb || '',
          v.status_kenaikan_bb || ''
        );
      } else {
        row.push('', '', '', '', '', '');
      }
    });

    return row;
  });

  const aoa = [headerRow1, headerRow2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;

  // Simple auto-fit columns
  const colWidths = [{ wch: 4 }, { wch: 25 }, { wch: 20 }, { wch: 12 }];
  for (let i = 4; i < headerRow2.length; i++) {
    colWidths.push({ wch: Math.max(10, headerRow2[i].length + 2) });
  }
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Posyandu');
  XLSX.writeFile(wb, `Rekap_Posyandu_${new Date().toISOString().split('T')[0]}.xlsx`);
}
