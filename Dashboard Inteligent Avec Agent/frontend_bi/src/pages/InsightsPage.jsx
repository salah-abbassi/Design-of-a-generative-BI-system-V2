import { useMemo, useState, useEffect } from 'react';
import { DashboardGrid } from '../components/DashboardGrid';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function InsightsPage() {
  const { globalDashboard, dataHealth } = useBiPlatform();
  const [periodKey, setPeriodKey] = useState('');
  const autoWidgets = globalDashboard || [];

  const dynamicPeriods = useMemo(() => {
    if (!dataHealth || !dataHealth.datetime_ranges || dataHealth.datetime_ranges.length === 0) {
      return [
        { key: '7d', label: '7 jours', factor: 0.85 },
        { key: '30d', label: '30 jours', factor: 1 },
        { key: '90d', label: '90 jours', factor: 1.22 }
      ];
    }

    let minD = new Date(dataHealth.datetime_ranges[0].min);
    let maxD = new Date(dataHealth.datetime_ranges[0].max);
    dataHealth.datetime_ranges.forEach(r => {
      const d1 = new Date(r.min);
      const d2 = new Date(r.max);
      if (d1 < minD) minD = d1;
      if (d2 > maxD) maxD = d2;
    });

    const diffTime = Math.abs(maxD - minD);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365 * 3) {
      return [
        { key: '1y', label: '1 an', factor: 0.35 },
        { key: '3y', label: '3 ans', factor: 0.75 },
        { key: 'max', label: 'Max', factor: 1 }
      ];
    } else if (diffDays > 365) {
      return [
        { key: '3m', label: '3 mois', factor: 0.35 },
        { key: '6m', label: '6 mois', factor: 0.65 },
        { key: 'max', label: 'Max', factor: 1 }
      ];
    } else if (diffDays > 90) {
      return [
        { key: '30d', label: '30 jours', factor: 0.4 },
        { key: '90d', label: '90 jours', factor: 0.8 },
        { key: 'max', label: 'Max', factor: 1 }
      ];
    } else if (diffDays > 30) {
      return [
        { key: '7d', label: '7 jours', factor: 0.3 },
        { key: '30d', label: '30 jours', factor: 0.75 },
        { key: 'max', label: 'Max', factor: 1 }
      ];
    } else {
      return [
        { key: 'first_half', label: '1ère Moitié', factor: 0.45 },
        { key: 'second_half', label: '2ème Moitié', factor: 0.55 },
        { key: 'max', label: 'Global', factor: 1 }
      ];
    }
  }, [dataHealth]);

  useEffect(() => {
    if (dynamicPeriods.length > 0 && !dynamicPeriods.find(p => p.key === periodKey)) {
      setPeriodKey(dynamicPeriods[dynamicPeriods.length - 1].key);
    }
  }, [dynamicPeriods, periodKey]);

  const simulatedWidgets = useMemo(() => {
    const periodObj = dynamicPeriods.find(p => p.key === periodKey) || dynamicPeriods[dynamicPeriods.length - 1];
    const factor = periodObj ? periodObj.factor : 1;
    
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
  }, [autoWidgets, periodKey, dynamicPeriods]);

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
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(30, 41, 59, 0.6)', padding: '0.4rem', borderRadius: '999px', border: '1px solid rgba(148, 163, 184, 0.2)', backdropFilter: 'blur(10px)' }}>
              {dynamicPeriods.map((period) => (
                <button
                  type="button"
                  key={period.key}
                  onClick={() => setPeriodKey(period.key)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: periodKey === period.key ? 'linear-gradient(135deg, #6366f1, #22c55e)' : 'transparent',
                    color: periodKey === period.key ? '#fff' : '#94a3b8',
                    fontWeight: periodKey === period.key ? 'bold' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: periodKey === period.key ? '0 4px 15px rgba(34, 197, 94, 0.3)' : 'none'
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <DashboardGrid items={simulatedWidgets} periodKey={periodKey} />
        </>
      )}
    </section>
  );
}
