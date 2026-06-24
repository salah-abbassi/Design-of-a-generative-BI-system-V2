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
              <h2>Contexte et domaine des données (Agent Explainer)</h2>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{dataHealth.dataset_explanation}</p>
            </div>
          )}

          {(dataHealth.columns_dropped?.length > 0 || dataHealth.column_cleanup_suggestions?.summary) && (
            <div className="bi-card bi-health-panel" style={{ marginBottom: '1.5rem' }}>
              <h2>Nettoyage des colonnes (Agent Cleaner)</h2>
              {dataHealth.column_cleanup_suggestions?.summary && (
                <p style={{ color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.6 }}>
                  {dataHealth.column_cleanup_suggestions.summary}
                </p>
              )}
              {dataHealth.columns_dropped?.length > 0 ? (
                <p style={{ margin: 0, color: '#e2e8f0' }}>
                  Colonnes supprimées après validation :{' '}
                  <strong style={{ color: '#f87171' }}>
                    {dataHealth.columns_dropped.join(', ')}
                  </strong>
                </p>
              ) : (
                <p style={{ margin: 0, color: '#86efac' }}>
                  Aucune colonne supprimée — toutes les colonnes ont été conservées.
                </p>
              )}
            </div>
          )}

          <div className="bi-health-panels">
            <div className="bi-card bi-health-panel">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,197,94,0.18))', fontSize: '1rem' }}>📊</span>
                Qualité des données
              </h2>
              {summary.topNullable ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                  <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    Colonne la plus incomplète : <strong style={{ color: '#f87171' }}>{summary.topNullable.name}</strong>
                    <span style={{ color: '#94a3b8' }}> — {toPct(summary.topNullable.null_pct)} de valeurs nulles</span>
                  </p>
                </div>
              ) : (
                <p className="bi-muted">Aucune colonne détectée.</p>
              )}
              {(() => {
                const EXCLUDED = ['phone', 'postalcode'];
                const filteredRanges = (dataHealth.datetime_ranges || []).filter(
                  (d) => !EXCLUDED.includes(d.column.toLowerCase()),
                );
                if (filteredRanges.length === 0) return null;

                const formatDate = (iso) => {
                  try {
                    const d = new Date(iso);
                    if (isNaN(d.getTime()) || d.getFullYear() < 1971) return iso;
                    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                  } catch { return iso; }
                };

                return (
                  <>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '1rem' }}>📅</span> Périodes détectées
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredRanges.map((d) => (
                        <div key={d.column} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.9rem',
                          padding: '0.8rem 1rem',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(34,197,94,0.06))',
                          border: '1px solid rgba(148,163,184,0.12)',
                          transition: 'all 0.25s ease',
                        }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                            background: 'linear-gradient(135deg, #6366f1, #22c55e)',
                            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            📆
                          </span>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                              {d.column.replace(/_/g, ' ')}
                            </p>
                            <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                              <span style={{ color: '#22c55e', fontWeight: 500 }}>{formatDate(d.min)}</span>
                              <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>→</span>
                              <span style={{ color: '#6366f1', fontWeight: 500 }}>{formatDate(d.max)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
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
