// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Artikel {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    verkaeufer?: string; // applookup -> URL zu 'Verkaeufer' Record
    kategorie?: string; // applookup -> URL zu 'Kategorien' Record
    titel?: string;
    beschreibung?: string;
    zustand?: LookupValue;
    preis?: number;
    fotos?: string;
  };
}

export interface Kategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategoriename?: string;
  };
}

export interface Verkaeufer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    zusatzinfo?: string;
  };
}

export const APP_IDS = {
  ARTIKEL: '69b1d00d94bcc8c610d06809',
  KATEGORIEN: '69b1d0099533f06ff2209934',
  VERKAEUFER: '69b1d00d22d9675ff59867b0',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'artikel': {
    zustand: [{ key: "neu", label: "Neu" }, { key: "wie_neu", label: "Wie neu" }, { key: "sehr_gut", label: "Sehr gut" }, { key: "gut", label: "Gut" }, { key: "akzeptabel", label: "Akzeptabel" }, { key: "defekt", label: "Defekt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'artikel': {
    'verkaeufer': 'applookup/select',
    'kategorie': 'applookup/select',
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'zustand': 'lookup/select',
    'preis': 'number',
    'fotos': 'file',
  },
  'kategorien': {
    'kategoriename': 'string/text',
  },
  'verkaeufer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'zusatzinfo': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateArtikel = StripLookup<Artikel['fields']>;
export type CreateKategorien = StripLookup<Kategorien['fields']>;
export type CreateVerkaeufer = StripLookup<Verkaeufer['fields']>;