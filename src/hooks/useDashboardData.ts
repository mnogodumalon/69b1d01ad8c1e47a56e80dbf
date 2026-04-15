import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Artikel, Kategorien, Verkaeufer } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [verkaeufer, setVerkaeufer] = useState<Verkaeufer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [artikelData, kategorienData, verkaeuferData] = await Promise.all([
        LivingAppsService.getArtikel(),
        LivingAppsService.getKategorien(),
        LivingAppsService.getVerkaeufer(),
      ]);
      setArtikel(artikelData);
      setKategorien(kategorienData);
      setVerkaeufer(verkaeuferData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [artikelData, kategorienData, verkaeuferData] = await Promise.all([
          LivingAppsService.getArtikel(),
          LivingAppsService.getKategorien(),
          LivingAppsService.getVerkaeufer(),
        ]);
        setArtikel(artikelData);
        setKategorien(kategorienData);
        setVerkaeufer(verkaeuferData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kategorienMap = useMemo(() => {
    const m = new Map<string, Kategorien>();
    kategorien.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kategorien]);

  const verkaeuferMap = useMemo(() => {
    const m = new Map<string, Verkaeufer>();
    verkaeufer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [verkaeufer]);

  return { artikel, setArtikel, kategorien, setKategorien, verkaeufer, setVerkaeufer, loading, error, fetchAll, kategorienMap, verkaeuferMap };
}