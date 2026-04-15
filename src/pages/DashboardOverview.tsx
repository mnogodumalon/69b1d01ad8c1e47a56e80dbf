import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichArtikel } from '@/lib/enrich';
import type { EnrichedArtikel } from '@/types/enriched';
import type { Kategorien, Verkaeufer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ArtikelDialog } from '@/components/dialogs/ArtikelDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch,
  IconShoppingBag, IconTag, IconUsers, IconCurrencyEuro,
  IconPhoto, IconLayoutGrid, IconList,
} from '@tabler/icons-react';

const APPGROUP_ID = '69b1d01ad8c1e47a56e80dbf';
const REPAIR_ENDPOINT = '/claude/build/repair';

const ZUSTAND_COLORS: Record<string, string> = {
  neu: 'bg-green-100 text-green-700',
  wie_neu: 'bg-emerald-100 text-emerald-700',
  sehr_gut: 'bg-blue-100 text-blue-700',
  gut: 'bg-sky-100 text-sky-700',
  akzeptabel: 'bg-amber-100 text-amber-700',
  defekt: 'bg-red-100 text-red-700',
};

type ViewMode = 'grid' | 'list';

export default function DashboardOverview() {
  const {
    artikel, kategorien, verkaeufer,
    kategorienMap, verkaeuferMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedArtikel = enrichArtikel(artikel, { verkaeuferMap, kategorienMap });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedArtikel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedArtikel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategorie, setSelectedKategorie] = useState<string | null>(null);
  const [selectedVerkaeufer, setSelectedVerkaeufer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [prefilledKategorieId, setPrefilledKategorieId] = useState<string | undefined>();

  const totalWert = useMemo(
    () => enrichedArtikel.reduce((sum, a) => sum + (a.fields.preis ?? 0), 0),
    [enrichedArtikel]
  );

  const filteredArtikel = useMemo(() => {
    let list = enrichedArtikel;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.fields.titel ?? '').toLowerCase().includes(q) ||
        (a.fields.beschreibung ?? '').toLowerCase().includes(q) ||
        a.verkaeuferName.toLowerCase().includes(q) ||
        a.kategorieName.toLowerCase().includes(q)
      );
    }
    if (selectedKategorie) {
      list = list.filter(a => {
        const url = a.fields.kategorie ?? '';
        return url.endsWith(selectedKategorie);
      });
    }
    if (selectedVerkaeufer) {
      list = list.filter(a => {
        const url = a.fields.verkaeufer ?? '';
        return url.endsWith(selectedVerkaeufer);
      });
    }
    return list;
  }, [enrichedArtikel, searchQuery, selectedKategorie, selectedVerkaeufer]);

  const artikelByKategorie = useMemo(() => {
    const groups = new Map<string, { label: string; items: EnrichedArtikel[] }>();
    groups.set('__none__', { label: 'Ohne Kategorie', items: [] });
    kategorien.forEach(k => {
      groups.set(k.record_id, { label: k.fields.kategoriename ?? k.record_id, items: [] });
    });
    filteredArtikel.forEach(a => {
      const url = a.fields.kategorie ?? '';
      const match = url.match(/([a-f0-9]{24})$/i);
      const key = match ? match[1] : '__none__';
      if (groups.has(key)) {
        groups.get(key)!.items.push(a);
      } else {
        groups.get('__none__')!.items.push(a);
      }
    });
    return Array.from(groups.entries())
      .filter(([, g]) => g.items.length > 0)
      .map(([id, g]) => ({ id, ...g }));
  }, [filteredArtikel, kategorien]);

  const handleCreate = async (fields: EnrichedArtikel['fields']) => {
    await LivingAppsService.createArtikelEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: EnrichedArtikel['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateArtikelEntry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteArtikelEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const openCreate = (kategorieId?: string) => {
    setEditRecord(null);
    setPrefilledKategorieId(kategorieId);
    setDialogOpen(true);
  };

  const openEdit = (a: EnrichedArtikel) => {
    setEditRecord(a);
    setPrefilledKategorieId(undefined);
    setDialogOpen(true);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const dialogDefaultValues = editRecord
    ? editRecord.fields
    : prefilledKategorieId
      ? { kategorie: createRecordUrl(APP_IDS.KATEGORIEN, prefilledKategorieId) }
      : undefined;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Artikel"
          value={String(artikel.length)}
          description="Insgesamt"
          icon={<IconShoppingBag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kategorien"
          value={String(kategorien.length)}
          description="Vorhanden"
          icon={<IconTag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verkäufer"
          value={String(verkaeufer.length)}
          description="Registriert"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtwert"
          value={totalWert > 0 ? formatCurrency(totalWert) : '—'}
          description="Alle Artikel"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            className="pl-9"
            placeholder="Artikel suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={selectedKategorie ?? ''}
          onChange={e => setSelectedKategorie(e.target.value || null)}
        >
          <option value="">Alle Kategorien</option>
          {kategorien.map((k: Kategorien) => (
            <option key={k.record_id} value={k.record_id}>
              {k.fields.kategoriename ?? k.record_id}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={selectedVerkaeufer ?? ''}
          onChange={e => setSelectedVerkaeufer(e.target.value || null)}
        >
          <option value="">Alle Verkäufer</option>
          {verkaeufer.map((v: Verkaeufer) => (
            <option key={v.record_id} value={v.record_id}>
              {[v.fields.vorname, v.fields.nachname].filter(Boolean).join(' ') || v.record_id}
            </option>
          ))}
        </select>

        <div className="flex items-center border border-input rounded-md overflow-hidden">
          <button
            className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}
            onClick={() => setViewMode('grid')}
            title="Rasteransicht"
          >
            <IconLayoutGrid size={16} />
          </button>
          <button
            className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}
            onClick={() => setViewMode('list')}
            title="Listenansicht"
          >
            <IconList size={16} />
          </button>
        </div>

        <Button onClick={() => openCreate()} className="shrink-0">
          <IconPlus size={16} className="mr-1 shrink-0" />
          <span>Artikel hinzufügen</span>
        </Button>
      </div>

      {/* Content */}
      {filteredArtikel.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <IconShoppingBag size={48} className="text-muted-foreground" stroke={1.5} />
          <div>
            <p className="font-semibold text-foreground">Keine Artikel gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || selectedKategorie || selectedVerkaeufer
                ? 'Passe deine Filter an oder füge einen neuen Artikel hinzu.'
                : 'Füge deinen ersten Artikel hinzu, um zu starten.'}
            </p>
          </div>
          <Button onClick={() => openCreate()}>
            <IconPlus size={16} className="mr-1" /> Artikel hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {artikelByKategorie.map(group => (
            <section key={group.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <IconTag size={16} className="shrink-0 text-muted-foreground" />
                  <h2 className="font-semibold text-base truncate">{group.label}</h2>
                  <Badge variant="secondary" className="shrink-0">{group.items.length}</Badge>
                </div>
                {group.id !== '__none__' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => openCreate(group.id)}
                  >
                    <IconPlus size={14} className="mr-1" />
                    <span className="hidden sm:inline">Hinzufügen</span>
                  </Button>
                )}
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.items.map(a => (
                    <ArtikelCard
                      key={a.record_id}
                      artikel={a}
                      onEdit={() => openEdit(a)}
                      onDelete={() => setDeleteTarget(a)}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Titel</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Zustand</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Verkäufer</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Preis</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((a, i) => (
                        <tr
                          key={a.record_id}
                          className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {a.fields.fotos ? (
                                <img
                                  src={a.fields.fotos}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                                  <IconPhoto size={14} className="text-muted-foreground" />
                                </div>
                              )}
                              <span className="truncate font-medium">{a.fields.titel ?? '(kein Titel)'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {a.fields.zustand && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ZUSTAND_COLORS[a.fields.zustand.key] ?? 'bg-muted text-muted-foreground'}`}>
                                {a.fields.zustand.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[140px]">
                            {a.verkaeuferName || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {a.fields.preis != null ? formatCurrency(a.fields.preis) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => openEdit(a)}
                                title="Bearbeiten"
                              >
                                <IconPencil size={14} />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => setDeleteTarget(a)}
                                title="Löschen"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ArtikelDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={dialogDefaultValues}
        verkaeuferList={verkaeufer}
        kategorienList={kategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Artikel']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Artikel löschen"
        description={`Möchtest du "${deleteTarget?.fields.titel ?? 'diesen Artikel'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ArtikelCard({
  artikel,
  onEdit,
  onDelete,
}: {
  artikel: EnrichedArtikel;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        {artikel.fields.fotos ? (
          <img
            src={artikel.fields.fotos}
            alt={artikel.fields.titel ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconPhoto size={32} className="text-muted-foreground" stroke={1.5} />
          </div>
        )}
        {artikel.fields.zustand && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${ZUSTAND_COLORS[artikel.fields.zustand.key] ?? 'bg-muted text-muted-foreground'}`}>
            {artikel.fields.zustand.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-w-0">
            {artikel.fields.titel ?? '(kein Titel)'}
          </h3>
          <span className="font-bold text-sm shrink-0 tabular-nums text-primary">
            {artikel.fields.preis != null ? formatCurrency(artikel.fields.preis) : '—'}
          </span>
        </div>

        {artikel.fields.beschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {artikel.fields.beschreibung}
          </p>
        )}

        {artikel.verkaeuferName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <IconUsers size={12} className="shrink-0" />
            <span className="truncate">{artikel.verkaeuferName}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
          <IconPencil size={14} className="mr-1 shrink-0" />
          Bearbeiten
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={onDelete}>
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-64 rounded-2xl" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
