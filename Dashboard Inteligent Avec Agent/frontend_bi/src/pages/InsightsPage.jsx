import { useMemo, useState } from 'react';
import { DashboardGrid } from '../components/DashboardGrid';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function InsightsPage() {
  const { globalDashboard } = useBiPlatform();
  const [periodKey, setPeriodKey] = useState('30d');
  const autoWidgets = globalDashboard || [];
  const periodFactors = { '7d': 0.85, '30d': 1, '90d': 1.22 };

  const simulatedWidgets = useMemo(() => {
    const factor = periodFactors[periodKey] || 1;
    return autoWidgets.map((item) => {
      if (item.type === 'MetricCard') {
        return { ...item, value: Number((Number(item.value || 0) * factor).toFixed(2)) };
      }
      if (Array.isArray(item.data)) {
        return {
          ...item,
          data: item.data.map((v, i) =>
            Number((Number(v || 0) * factor * (1 + ((i % 3) - 1) * 0.04)).toFixed(2)),
          ),
        };
      }
      return item;
    });
  }, [autoWidgets, periodKey]);

  return (
    <section className="bi-page bi-page-left">
      <h1>Dashboard Général</h1>
      <p className="bi-lead">
        Analyses automatiques produites par les agents IA.
      </p>

      {(!globalDashboard || globalDashboard.length === 0) && (
        <p className="bi-muted">
          Aucun insight généré pour le moment.
        </p>
      )}

      {autoWidgets.length > 0 && (
        <>
          <div className="bi-period-filter">
            {['7d', '30d', '90d'].map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setPeriodKey(key)}
                className={periodKey === key ? 'bi-period-btn active' : 'bi-period-btn'}
              >
                {key === '7d' ? '7 jours' : key === '30d' ? '30 jours' : '90 jours'}
              </button>
            ))}
          </div>
          <DashboardGrid items={simulatedWidgets} periodKey={periodKey} />
        </>
      )}
    </section>
  );
}
