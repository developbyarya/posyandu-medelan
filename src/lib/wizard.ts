import { db, newUuid } from '../db/db';
import type { KunjunganILP } from '../db/types';

export async function getOrCreateDraftVisit(balitaId: string): Promise<KunjunganILP> {
  const todayStr = new Date().toLocaleDateString('en-CA');
  
  const existing = await db.kunjungan
    .where('balita_uuid')
    .equals(balitaId)
    .and(k => k.tanggal_kunjungan === todayStr)
    .first();

  if (existing) {
    return existing;
  }

  // Create new draft
  const draft = {
    local_uuid: newUuid(),
    balita_uuid: balitaId,
    tanggal_kunjungan: todayStr,
    sync_status: 'draft' as const,
    updated_at: new Date().toISOString()
  } as KunjunganILP;

  await db.kunjungan.add(draft);
  return draft;
}

export async function updateDraftVisit(visitId: string, payload: Partial<KunjunganILP>) {
  await db.kunjungan.where('local_uuid').equals(visitId).modify({
    ...payload,
    updated_at: new Date().toISOString()
  });
}

export async function finishVisit(visitId: string) {
  await db.kunjungan.where('local_uuid').equals(visitId).modify({
    sync_status: 'pending',
    updated_at: new Date().toISOString()
  });
}
