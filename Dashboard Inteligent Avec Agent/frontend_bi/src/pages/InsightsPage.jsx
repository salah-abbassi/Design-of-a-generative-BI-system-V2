import { DashboardGrid } from '../components/DashboardGrid';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function InsightsPage() {
  const { globalDashboard } = useBiPlatform();
  const autoWidgets = globalDashboard || [];

  return (
    <section className="bi-page">
      <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', lineHeight: '1.2', paddingBottom: '0.1em', background: 'linear-gradient(to right, #6366f1, #00ffd0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
          Dashboard Général
        </h1>
        <p className="bi-lead" style={{ margin: '0 auto', fontSize: '1.1rem', maxWidth: '600px' }}>
          Analyses automatiques et KPIs extraits intelligemment par nos agents IA à partir de vos données.
        </p>
      </div>

      {(!globalDashboard || globalDashboard.length === 0) && (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(148, 163, 184, 0.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <p className="bi-muted" style={{ fontSize: '1.1rem' }}>Aucun insight généré pour le moment. Veuillez ingérer un dataset depuis la source de données.</p>
        </div>
      )}

      {autoWidgets.length > 0 && (
        <div style={{ paddingBottom: '2rem' }}>
          <DashboardGrid items={autoWidgets} />
        </div>
      )}
    </section>
  );
}
