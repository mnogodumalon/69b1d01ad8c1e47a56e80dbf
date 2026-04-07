import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichArtikel } from '@/lib/enrich';
import type { EnrichedArtikel } from '@/types/enriched';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ArtikelDialog } from '@/components/dialogs/ArtikelDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  IconAlertCircle, IconPlus, IconPencil, IconTrash,
  IconTag, IconUsers, IconPackage, IconCurrencyEuro, IconSearch, IconPhoto,
  IconRocket, IconClipboardList, IconChevronRight,
} from '@tabler/icons-react';

const ZUSTAND_COLORS: Record<string, string> = {
  neu: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  wie_neu: 'bg-green-100 text-green-800 border-green-200',
  sehr_gut: 'bg-blue-100 text-blue-800 border-blue-200',
  gut: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  akzeptabel: 'bg-amber-100 text-amber-800 border-amber-200',
  defekt: 'bg-red-100 text-red-800 border-red-200',
};

export default function DashboardOverview() {
  const {
    artikel, verkaeufer, kategorien,
    verkaeuferMap, kategorienMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedArtikel = enrichArtikel(artikel, { verkaeuferMap, kategorienMap });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnrichedArtikel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedArtikel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedZustand, setSelectedZustand] = useState('all');

  const filteredArtikel = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enrichedArtikel.filter(a => {
      const matchesSearch = !q ||
        (a.fields.titel?.toLowerCase() ?? '').includes(q) ||
        a.verkaeuferName.toLowerCase().includes(q) ||
        a.kategorieName.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' ||
        extractRecordId(a.fields.kategorie) === selectedCategory;
      const matchesZustand = selectedZustand === 'all' ||
        a.fields.zustand?.key === selectedZustand;
      return matchesSearch && matchesCategory && matchesZustand;
    });
  }, [enrichedArtikel, searchQuery, selectedCategory, selectedZustand]);

  const totalPreis = useMemo(
    () => artikel.reduce((sum, a) => sum + (a.fields.preis ?? 0), 0),
    [artikel],
  );

  const groupedView = useMemo(() => {
    const isFiltered = selectedCategory !== 'all' || !!searchQuery || selectedZustand !== 'all';
    if (isFiltered) return null;
    const groups: { id: string; name: string; items: EnrichedArtikel[] }[] = [];
    kategorien.forEach(k => {
      const items = filteredArtikel.filter(a => extractRecordId(a.fields.kategorie) === k.record_id);
      if (items.length > 0) groups.push({ id: k.record_id, name: k.fields.kategoriename ?? 'Kategorie', items });
    });
    const uncategorized = filteredArtikel.filter(a => !extractRecordId(a.fields.kategorie));
    if (uncategorized.length > 0) groups.push({ id: 'none', name: 'Ohne Kategorie', items: uncategorized });
    return groups.length > 0 ? groups : null;
  }, [filteredArtikel, kategorien, selectedCategory, searchQuery, selectedZustand]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflows */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <IconRocket size={18} className="text-primary shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="#/intents/artikel-annahme"
            className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardList size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">Artikel-Annahme</p>
              <p className="text-xs text-muted-foreground truncate">Verkäufer anmelden & Artikel erfassen</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
          <a
            href="#/intents/kategorie-aufbereitung"
            className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconTag size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">Kategorie-Aufbereitung</p>
              <p className="text-xs text-muted-foreground truncate">Artikel nach Kategorien organisieren</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
        </div>
      </section>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flohmarkt</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {artikel.length} Artikel von {verkaeufer.length} Verkäufern
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Artikel anlegen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Artikel"
          value={String(artikel.length)}
          description="Insgesamt"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verkäufer"
          value={String(verkaeufer.length)}
          description="Registriert"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kategorien"
          value={String(kategorien.length)}
          description="Insgesamt"
          icon={<IconTag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtwert"
          value={formatCurrency(totalPreis)}
          description="Alle Artikel"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0 pointer-events-none" />
          <Input
            placeholder="Suche nach Titel, Verkäufer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {kategorien.map(k => (
              <SelectItem key={k.record_id} value={k.record_id}>
                {k.fields.kategoriename ?? '—'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedZustand} onValueChange={setSelectedZustand}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Zustand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Zustände</SelectItem>
            <SelectItem value="neu">Neu</SelectItem>
            <SelectItem value="wie_neu">Wie neu</SelectItem>
            <SelectItem value="sehr_gut">Sehr gut</SelectItem>
            <SelectItem value="gut">Gut</SelectItem>
            <SelectItem value="akzeptabel">Akzeptabel</SelectItem>
            <SelectItem value="defekt">Defekt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filteredArtikel.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <IconPackage size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="font-medium text-foreground">Keine Artikel gefunden</p>
          <p className="text-sm text-muted-foreground">
            {artikel.length === 0
              ? 'Leg deinen ersten Artikel an.'
              : 'Passe die Filter an oder lege einen neuen Artikel an.'}
          </p>
          {artikel.length === 0 && (
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <IconPlus size={16} className="mr-1 shrink-0" />
              Artikel anlegen
            </Button>
          )}
        </div>
      ) : groupedView ? (
        <div className="space-y-8">
          {groupedView.map(group => (
            <section key={group.id}>
              <div className="flex items-center gap-2 mb-4">
                <IconTag size={16} className="text-muted-foreground shrink-0" />
                <h2 className="text-base font-semibold text-foreground">{group.name}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map(a => (
                  <ArtikelCard
                    key={a.record_id}
                    artikel={a}
                    onEdit={() => setEditTarget(a)}
                    onDelete={() => setDeleteTarget(a)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredArtikel.map(a => (
            <ArtikelCard
              key={a.record_id}
              artikel={a}
              onEdit={() => setEditTarget(a)}
              onDelete={() => setDeleteTarget(a)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <ArtikelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createArtikelEntry(fields);
          fetchAll();
        }}
        verkaeuferList={verkaeufer}
        kategorienList={kategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Artikel']}
      />

      {/* Edit Dialog */}
      <ArtikelDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={async (fields) => {
          if (!editTarget) return;
          await LivingAppsService.updateArtikelEntry(editTarget.record_id, fields);
          fetchAll();
        }}
        defaultValues={editTarget?.fields}
        verkaeuferList={verkaeufer}
        kategorienList={kategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Artikel']}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Artikel löschen"
        description={`Möchtest du "${deleteTarget?.fields.titel ?? 'diesen Artikel'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await LivingAppsService.deleteArtikelEntry(deleteTarget.record_id);
          setDeleteTarget(null);
          fetchAll();
        }}
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
  const zustandKey = artikel.fields.zustand?.key ?? '';
  const zustandLabel = artikel.fields.zustand?.label ?? '';
  const badgeClass = ZUSTAND_COLORS[zustandKey] ?? 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      {/* Photo */}
      {artikel.fields.fotos ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={artikel.fields.fotos}
            alt={artikel.fields.titel ?? 'Artikel'}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-muted flex items-center justify-center">
          <IconPhoto size={32} className="text-muted-foreground" stroke={1.5} />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Title + Condition */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate min-w-0">
            {artikel.fields.titel ?? '—'}
          </h3>
          {zustandLabel && (
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}>
              {zustandLabel}
            </span>
          )}
        </div>

        {/* Price */}
        {artikel.fields.preis != null && (
          <p className="text-xl font-bold text-primary leading-tight">
            {formatCurrency(artikel.fields.preis)}
          </p>
        )}

        {/* Description */}
        {artikel.fields.beschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {artikel.fields.beschreibung}
          </p>
        )}

        {/* Meta: category + seller */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-1">
          {artikel.kategorieName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
              <IconTag size={11} className="shrink-0" />
              <span className="truncate">{artikel.kategorieName}</span>
            </span>
          )}
          {artikel.verkaeuferName && (
            <span className="text-xs text-muted-foreground truncate min-w-0">
              von {artikel.verkaeuferName}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <IconPencil size={14} className="mr-1 shrink-0" />
            Bearbeiten
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={onDelete}
          >
            <IconTrash size={14} className="shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[160px]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
