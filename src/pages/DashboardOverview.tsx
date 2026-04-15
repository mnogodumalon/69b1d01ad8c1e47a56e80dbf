import { useDashboardData } from '@/hooks/useDashboardData';
import { PageShell } from '@/components/PageShell';

export default function DashboardOverview() {
  const { artikel, kategorien, verkaeufer, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <PageShell title="Dashboard" subtitle="Übersicht">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-[27px] bg-card shadow-lg p-6">
          <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Artikel</p>
          <p className="text-4xl font-bold mt-2">{artikel.length}</p>
        </div>
        <div className="rounded-[27px] bg-card shadow-lg p-6">
          <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Kategorien</p>
          <p className="text-4xl font-bold mt-2">{kategorien.length}</p>
        </div>
        <div className="rounded-[27px] bg-card shadow-lg p-6">
          <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Verkäufer</p>
          <p className="text-4xl font-bold mt-2">{verkaeufer.length}</p>
        </div>
      </div>
    </PageShell>
  );
}
