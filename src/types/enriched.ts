import type { Artikel } from './app';

export type EnrichedArtikel = Artikel & {
  verkaeuferName: string;
  kategorieName: string;
};
