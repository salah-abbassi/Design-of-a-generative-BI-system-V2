import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { DashboardGrid } from '../components/DashboardGrid';
import { useBiPlatform } from '../context/BiPlatformContext';

function toPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function summarizeHealth(dataHealth) {
  if (!dataHealth) return null;
  const cols = Array.isArray(dataHealth.columns) ? dataHealth.columns : [];
  const rowCount = Number(dataHealth.row_count || 0);
  const columnCount = Number(dataHealth.column_count || cols.length || 0);
  const avgNullPct =
    cols.length > 0
      ? cols.reduce((acc, c) => acc + Number(c.null_pct || 0), 0) / cols.length
      : 0;
  const dataCompleteness = Math.max(0, 100 - avgNullPct);
  const highRiskCols = cols.filter((c) => Number(c.null_pct || 0) >= 20).length;
  const numericCols = cols.filter((c) =>
    ['int', 'float', 'double', 'number'].some((token) =>
      String(c.dtype || '').toLowerCase().includes(token),
    ),
  ).length;
  const topNullable =
    cols.length > 0
      ? cols.reduce((a, b) => (Number(a.null_pct || 0) >= Number(b.null_pct || 0) ? a : b))
      : null;

  return {
    rowCount,
    columnCount,
    avgNullPct,
    dataCompleteness,
    highRiskCols,
    numericCols,
    topNullable,
  };
}

export default function GlobalDashboardPage() {
  const { dataHealth, globalDashboard } = useBiPlatform();
  const [periodKey, setPeriodKey] = useState('30d');
  const summary = summarizeHealth(dataHealth);
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
      <h1>Tableau de bord global</h1>
      <p className="bi-lead">
        Vue exécutive de la qualité de vos données et des analyses automatiques produites par
        les agents IA.
      </p>

      {!dataHealth && (!globalDashboard || globalDashboard.length === 0) && (
        <p className="bi-muted">
          Aucune donnée chargée pour le moment.{' '}
          <Link to="/upload">Téléverser un fichier</Link>
        </p>
      )}

      {summary && (
        <>
          <div className="bi-summary-grid">
            <article className="bi-summary-card">
              <p className="bi-summary-label">Lignes</p>
              <p className="bi-summary-value">{new Intl.NumberFormat('fr-FR').format(summary.rowCount)}</p>
            </article>
            <article className="bi-summary-card">
              <p className="bi-summary-label">Colonnes</p>
              <p className="bi-summary-value">{summary.columnCount}</p>
            </article>
            <article className="bi-summary-card">
              <p className="bi-summary-label">Complétude moyenne</p>
              <p className="bi-summary-value">{toPct(summary.dataCompleteness)}</p>
            </article>
            <article className="bi-summary-card">
              <p className="bi-summary-label">Colonnes numériques</p>
              <p className="bi-summary-value">{summary.numericCols}</p>
            </article>
            <article className="bi-summary-card">
              <p className="bi-summary-label">Colonnes à risque (&gt;= 20% nuls)</p>
              <p className="bi-summary-value">{summary.highRiskCols}</p>
            </article>
            <article className="bi-summary-card">
              <p className="bi-summary-label">Taux de null moyen</p>
              <p className="bi-summary-value">{toPct(summary.avgNullPct)}</p>
            </article>
          </div>

          <div className="bi-health-panels">
            <div className="bi-card bi-health-panel">
              <h2>Qualité des données</h2>
              {summary.topNullable ? (
                <p className="bi-muted">
                  Colonne la plus incomplète : <strong>{summary.topNullable.name}</strong> (
                  {toPct(summary.topNullable.null_pct)} de valeurs nulles)
                </p>
              ) : (
                <p className="bi-muted">Aucune colonne détectée.</p>
              )}
              {dataHealth.datetime_ranges?.length > 0 && (
                <>
                  <h3>Périodes détectées</h3>
                  <ul className="bi-health-list">
                    {dataHealth.datetime_ranges.map((d) => (
                      <li key={d.column}>
                        {d.column} : {d.min} → {d.max}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="bi-card bi-health-panel">
              <h2>Détail des colonnes</h2>
              <div className="bi-table-wrap">
                <table className="bi-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Type</th>
                      <th>Nuls</th>
                      <th>% nuls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dataHealth.columns || []).map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td>{c.dtype}</td>
                        <td>{c.null_count}</td>
                        <td>{c.null_pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {autoWidgets.length > 0 && (
        <>
          <h2 className="bi-section-title">Insights IA automatiques</h2>
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
