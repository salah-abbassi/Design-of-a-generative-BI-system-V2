import { Link } from 'react-router-dom';
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
  const summary = summarizeHealth(dataHealth);

  return (
    <section className="bi-page">
      <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', lineHeight: '1.2', paddingBottom: '0.1em', background: 'linear-gradient(to right, #6366f1, #00ffd0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
          Vue Exécutive
        </h1>
        <p className="bi-lead" style={{ margin: '0 auto', fontSize: '1.1rem', maxWidth: '600px' }}>
          Bilan de santé et de qualité de vos données avant analyse.
        </p>
      </div>

      {!dataHealth && (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(148, 163, 184, 0.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
          <p className="bi-muted" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Aucune donnée chargée pour le moment.</p>
          <Link to="/upload" style={{
            display: 'inline-block',
            padding: '0.8rem 2rem',
            background: 'linear-gradient(135deg, #6366f1, #22c55e)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '999px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
          }}>
            Téléverser un fichier
          </Link>
        </div>
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

          {dataHealth.dataset_explanation && (
            <div className="bi-card bi-health-panel" style={{ marginBottom: '1.5rem' }}>
              <h2>Contexte et domaine des données (Agent IA)</h2>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{dataHealth.dataset_explanation}</p>
            </div>
          )}

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
                      <th>Moyenne</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Écart-type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dataHealth.columns || []).map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td>{c.dtype}</td>
                        <td>{c.null_count}</td>
                        <td>{c.null_pct}</td>
                        <td>{c.is_numeric && c.mean != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(c.mean) : '-'}</td>
                        <td>{c.is_numeric && c.min != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(c.min) : '-'}</td>
                        <td>{c.is_numeric && c.max != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(c.max) : '-'}</td>
                        <td>{c.is_numeric && c.std != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(c.std) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}


    </section>
  );
}
