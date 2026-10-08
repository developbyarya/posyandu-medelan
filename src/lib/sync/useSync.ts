import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { syncAll, supabase } from './sync';

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ pushed: number, pulled: number } | null>(null);

  // Auto-sync when coming online
  useEffect(() => {
    if (!supabase) return;

    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('online', handleOnline);
    
    // Also trigger once on mount if online
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!supabase || !navigator.onLine || isSyncing) return;
    try {
      setIsSyncing(true);
      const res = await syncAll();
      setLastSyncResult(res);
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const pendingCount = useLiveQuery(async () => {
    const pB = await db.balita.where('sync_status').equals('pending').count();
    const pK = await db.kunjungan.where('sync_status').equals('pending').count();
    return pB + pK;
  }, []);

  return {
    isSyncing,
    pendingCount: pendingCount || 0,
    lastSyncResult,
    triggerSync,
    isConfigured: !!supabase
  };
}
