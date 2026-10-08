import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function RekapPrint() {
  const balitaList = useLiveQuery(() => db.balita.filter(b => !b.deleted_at && !b.is_pindah).toArray(), []);
  const visits = useLiveQuery(() => db.kunjungan.toArray(), []);

  useEffect(() => {
    if (balitaList && visits) {
      // Wait a moment for rendering before triggering print
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [balitaList, visits]);

  if (!balitaList || !visits) {
    return <div className="p-8 text-center text-xl">Memuat data rekap...</div>;
  }

  // Filter and sort data
  const activeUuids = new Set(balitaList.map(b => b.local_uuid));
  const activeVisits = visits.filter(v => activeUuids.has(v.balita_uuid));

  const monthSet = new Set<string>();
  for (const v of activeVisits) {
    if (v.tanggal_kunjungan) {
      monthSet.add(v.tanggal_kunjungan.substring(0, 7)); // YYYY-MM
    }
  }
  const uniqueMonths = Array.from(monthSet).sort();
  
  // Sort balita alphabetically
  const sortedBalita = [...balitaList].sort((a, b) => a.nama_balita.localeCompare(b.nama_balita));

  // Determine year spans for headers
  const yearSpans: { year: string, colspan: number }[] = [];
  let currentYear = '';
  let currentColspan = 0;

  uniqueMonths.forEach(ym => {
    const year = ym.substring(0, 4);
    if (currentYear !== year) {
      if (currentYear !== '') {
        yearSpans.push({ year: currentYear, colspan: currentColspan });
      }
      currentYear = year;
      currentColspan = 6; // 6 columns per month
    } else {
      currentColspan += 6;
    }
  });
  if (currentYear !== '') {
    yearSpans.push({ year: currentYear, colspan: currentColspan });
  }

  return (
    <div className="bg-white text-black p-4 text-xs font-sans" style={{ minWidth: 'max-content' }}>
      <h1 className="text-2xl font-bold mb-4 text-center">Rekap Data Posyandu Medelan</h1>
      
      <table className="w-full border-collapse border border-black text-center">
        <thead>
          <tr>
            <th className="border border-black p-1" rowSpan={3}>No</th>
            <th className="border border-black p-1 min-w-[150px]" rowSpan={3}>Nama Balita</th>
            <th className="border border-black p-1 min-w-[120px]" rowSpan={3}>Nama Orang Tua</th>
            <th className="border border-black p-1" rowSpan={3}>Tanggal Lahir</th>
            {yearSpans.map(ys => (
              <th key={ys.year} className="border border-black p-1 bg-gray-200" colSpan={ys.colspan}>
                {ys.year}
              </th>
            ))}
          </tr>
          <tr>
            {uniqueMonths.map(ym => {
              const monthName = MONTH_NAMES[parseInt(ym.substring(5, 7), 10) - 1];
              return (
                <th key={ym} className="border border-black p-1 bg-gray-100" colSpan={6}>
                  {monthName}
                </th>
              );
            })}
          </tr>
          <tr>
            {uniqueMonths.map(ym => (
              <React.Fragment key={ym}>
                <th className="border border-black p-1 bg-gray-50">BB</th>
                <th className="border border-black p-1 bg-gray-50">TB</th>
                <th className="border border-black p-1 bg-gray-50">LK</th>
                <th className="border border-black p-1 bg-gray-50">LiLA</th>
                <th className="border border-black p-1 bg-gray-50">Gizi</th>
                <th className="border border-black p-1 bg-gray-50">Tren</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedBalita.map((balita, i) => {
            const balitaVisits = activeVisits.filter(v => v.balita_uuid === balita.local_uuid);
            const visitMap = new Map(balitaVisits.map(v => [v.tanggal_kunjungan.substring(0, 7), v]));

            return (
              <tr key={balita.local_uuid} className="even:bg-gray-50">
                <td className="border border-black p-1">{i + 1}</td>
                <td className="border border-black p-1 text-left">{balita.nama_balita}</td>
                <td className="border border-black p-1 text-left">{balita.nama_ortu}</td>
                <td className="border border-black p-1 whitespace-nowrap">{balita.tanggal_lahir}</td>
                {uniqueMonths.map(ym => {
                  const v = visitMap.get(ym);
                  if (v) {
                    return (
                      <React.Fragment key={ym}>
                        <td className="border border-black p-1">{v.bb ?? '-'}</td>
                        <td className="border border-black p-1">{v.tb ?? '-'}</td>
                        <td className="border border-black p-1">{v.lingkar_kepala ?? '-'}</td>
                        <td className="border border-black p-1">{v.lila ?? '-'}</td>
                        <td className="border border-black p-1">{v.status_bbtb || '-'}</td>
                        <td className="border border-black p-1">{v.status_kenaikan_bb || '-'}</td>
                      </React.Fragment>
                    );
                  } else {
                    return (
                      <React.Fragment key={ym}>
                        <td className="border border-black p-1">-</td>
                        <td className="border border-black p-1">-</td>
                        <td className="border border-black p-1">-</td>
                        <td className="border border-black p-1">-</td>
                        <td className="border border-black p-1">-</td>
                        <td className="border border-black p-1">-</td>
                      </React.Fragment>
                    );
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
