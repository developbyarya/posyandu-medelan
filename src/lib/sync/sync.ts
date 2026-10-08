import { createClient } from '@supabase/supabase-js';
import { db } from '../../db/db';
import type { Balita, KunjunganILP } from '../../db/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Track last sync time in localStorage
const LAST_PULL_KEY = 'posyandu_last_pull_at';

export async function syncPush(): Promise<number> {
  if (!supabase || !navigator.onLine) return 0;
  let pushedCount = 0;

  // 1. Push Balita
  const pendingBalita = await db.balita.where('sync_status').equals('pending').toArray();
  if (pendingBalita.length > 0) {
    const payload = pendingBalita.map(b => {
      const { id, sync_status, ...rest } = b as any; // remove local fields
      return rest;
    });

    const { error } = await supabase.from('balita').upsert(payload, { onConflict: 'local_uuid' });
    if (!error) {
      // Mark as synced
      const uuids = pendingBalita.map(b => b.local_uuid);
      await db.balita.where('local_uuid').anyOf(uuids).modify({ sync_status: 'synced' });
      pushedCount += pendingBalita.length;
    } else {
      console.error('Push balita error:', error);
      return pushedCount; // Stop pushing if balita fails, otherwise kunjungan will trigger FK constraint error
    }
  }

  // 2. Push Kunjungan
  const pendingKunjungan = await db.kunjungan.where('sync_status').equals('pending').toArray();
  if (pendingKunjungan.length > 0) {
    const payload = pendingKunjungan.map(k => {
      const { id, sync_status, ...rest } = k as any;
      return rest;
    });

    const { error } = await supabase.from('kunjungan').upsert(payload, { onConflict: 'local_uuid' });
    if (!error) {
      const uuids = pendingKunjungan.map(k => k.local_uuid);
      await db.kunjungan.where('local_uuid').anyOf(uuids).modify({ sync_status: 'synced' });
      pushedCount += pendingKunjungan.length;
    } else {
      console.error('Push kunjungan error:', error);
    }
  }

  return pushedCount;
}

export async function syncPull(): Promise<number> {
  if (!supabase || !navigator.onLine) return 0;
  
  const lastPullAt = localStorage.getItem(LAST_PULL_KEY) || '2000-01-01T00:00:00.000Z';
  let pulledCount = 0;

  // 1. Pull Balita
  const { data: newBalita, error: errB } = await supabase
    .from('balita')
    .select('*')
    .gt('updated_at', lastPullAt);
    
  if (newBalita && newBalita.length > 0) {
    await db.transaction('rw', db.balita, async () => {
      for (const b of newBalita) {
        const local = await db.balita.where('local_uuid').equals(b.local_uuid).first();
        if (!local || b.updated_at > local.updated_at) {
          b.sync_status = 'synced';
          await db.balita.put(b as Balita);
          pulledCount++;
        }
      }
    });
  }

  // 2. Pull Kunjungan
  const { data: newKunjungan, error: errK } = await supabase
    .from('kunjungan')
    .select('*')
    .gt('updated_at', lastPullAt);
    
  if (newKunjungan && newKunjungan.length > 0) {
    await db.transaction('rw', db.kunjungan, async () => {
      for (const k of newKunjungan) {
        const local = await db.kunjungan.where('local_uuid').equals(k.local_uuid).first();
        if (!local || k.updated_at > local.updated_at) {
          k.sync_status = 'synced';
          await db.kunjungan.put(k as KunjunganILP);
          pulledCount++;
        }
      }
    });
  }

  if (!errB && !errK) {
    localStorage.setItem(LAST_PULL_KEY, new Date().toISOString());
  }

  return pulledCount;
}

export async function syncAll(): Promise<{ pushed: number, pulled: number }> {
  const pushed = await syncPush();
  const pulled = await syncPull();
  return { pushed, pulled };
}
