import type { EnrichedArtikel } from '@/types/enriched';
import type { Artikel, Kategorien, Verkaeufer } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface ArtikelMaps {
  verkaeuferMap: Map<string, Verkaeufer>;
  kategorienMap: Map<string, Kategorien>;
}

export function enrichArtikel(
  artikel: Artikel[],
  maps: ArtikelMaps
): EnrichedArtikel[] {
  return artikel.map(r => ({
    ...r,
    verkaeuferName: resolveDisplay(r.fields.verkaeufer, maps.verkaeuferMap, 'vorname', 'nachname'),
    kategorieName: resolveDisplay(r.fields.kategorie, maps.kategorienMap, 'kategoriename'),
  }));
}
