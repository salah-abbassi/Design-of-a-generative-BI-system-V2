import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import { useBiPlatform } from '../context/BiPlatformContext';

const CONFIDENCE_LABELS = {
  high: { label: 'Haute', color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)' },
  medium: { label: 'Moyenne', color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.12)' },
  low: { label: 'Faible', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
};

async function readNdjsonStream(response, onLine) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      const stop = onLine(data);
      if (stop) return data;
    }
  }
  return null;
}

export default function DataSourcePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [message, setMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [dataHealth, setDataHealth] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedDrops, setSelectedDrops] = useState(new Set());

  const { setUploadResult } = useBiPlatform();
  const navigate = useNavigate();

  const suggestedColumns = suggestions?.columns_to_drop ?? [];

  const preselectedHigh = useMemo(
    () => suggestedColumns.filter((c) => c.confidence === 'high').map((c) => c.name),
    [suggestedColumns],
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) resetAndSetFile(droppedFile);
  };

  const resetAndSetFile = (selected) => {
    setFile(selected);
    setSessionId(null);
    setDataHealth(null);
    setSuggestions(null);
    setSelectedDrops(new Set());
    setMessage(null);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) resetAndSetFile(selected);
  };

  const toggleColumn = (name) => {
    setSelectedDrops((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAllSuggested = () => {
    setSelectedDrops(new Set(suggestedColumns.map((c) => c.name)));
  };

  const selectHighConfidence = () => {
    setSelectedDrops(new Set(preselectedHigh));
  };

  const clearSelection = () => {
    setSelectedDrops(new Set());
  };

  const handleStreamProgress = (data) => {
    if (data.erreur) {
      setMessage({ type: 'err', text: data.erreur });
      setLoading(false);
      return true;
    }

    if (data.progress !== undefined) setProgress(data.progress);

    if (data.step === 'ingestion') setStatusText('Lecture et analyse du fichier...');
    if (data.step === 'column_cleaning') setStatusText('Analyse des colonnes inutiles par IA...');
    if (data.step === 'applying_drops') setStatusText('Application des suppressions...');
    if (data.step === 'explanation') setStatusText('Génération de l\'explication métier...');
    if (data.step === 'analyst') setStatusText('Analyse des KPIs potentiels...');
    if (data.step === 'engineer') setStatusText('Génération des requêtes SQL...');
    if (data.step === 'designer') setStatusText('Conception du tableau de bord...');

    if (data.step === 'awaiting_confirmation') {
      setSessionId(data.session_id);
      setDataHealth(data.data_health ?? null);
      setSuggestions(data.column_cleanup_suggestions ?? null);
      const highCols = (data.column_cleanup_suggestions?.columns_to_drop ?? [])
        .filter((c) => c.confidence === 'high')
        .map((c) => c.name);
      setSelectedDrops(new Set(highCols));
      setLoading(false);
      setStatusText('');
      setProgress(30);
      return true;
    }

    if (data.step === 'done') {
      setStatusText('Terminé !');
      setUploadResult({
        dataHealth: data.data_health ?? null,
        dashboard: data.dashboard ?? [],
      });
      setMessage({ type: 'ok', text: 'Fichier ingéré et auto-analyse terminée.' });
      setTimeout(() => navigate('/dashboard'), 800);
      return true;
    }

    return false;
  };

  const onSubmit = async () => {
    if (!file) {
      setMessage({ type: 'err', text: 'Choisissez un fichier .csv ou .xlsx.' });
      return;
    }

    setLoading(true);
    setProgress(0);
    setMessage(null);
    setStatusText('Connexion au serveur...');
    setSessionId(null);
    setDataHealth(null);
    setSuggestions(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(apiUrl('/api/upload/'), { method: 'POST', body: fd });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setMessage({ type: 'err', text: errorData?.erreur || 'Échec du téléversement.' });
        setLoading(false);
        return;
      }
      await readNdjsonStream(res, handleStreamProgress);
    } catch {
      setMessage({ type: 'err', text: 'Impossible de joindre le serveur ou erreur de lecture.' });
      setLoading(false);
    }
  };

  const onConfirm = async () => {
    if (!sessionId) return;

    setLoading(true);
    setProgress(35);
    setMessage(null);
    setStatusText('Finalisation du dataset...');

    try {
      const res = await fetch(apiUrl('/api/upload/confirm/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          columns_to_drop: Array.from(selectedDrops),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setMessage({ type: 'err', text: errorData?.erreur || 'Échec de la confirmation.' });
        setLoading(false);
        return;
      }

      await readNdjsonStream(res, handleStreamProgress);
    } catch {
      setMessage({ type: 'err', text: 'Impossible de joindre le serveur ou erreur de lecture.' });
      setLoading(false);
    }
  };

  const awaitingConfirmation = sessionId && !loading;

  return (
    <section className="bi-page" style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{
          fontSize: '2.8rem', lineHeight: '1.2', paddingBottom: '0.1em',
          background: 'linear-gradient(to right, #6366f1, #22c55e)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem',
        }}>
          Connectez vos données
        </h1>
        <p className="bi-lead" style={{ margin: '0 auto', fontSize: '1.1rem' }}>
          Déposez votre fichier. Un agent IA analysera les colonnes inutiles avant de construire votre dashboard.
        </p>
      </div>

      {!awaitingConfirmation && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#22c55e' : 'rgba(148, 163, 184, 0.4)'}`,
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
              background: isDragging ? 'rgba(34, 197, 94, 0.05)' : 'rgba(15, 23, 42, 0.4)',
              transition: 'all 0.3s ease',
              marginBottom: '2rem',
              position: 'relative',
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              disabled={loading}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                opacity: 0,
                cursor: loading ? 'default' : 'pointer',
              }}
            />
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: isDragging ? '#22c55e' : '#64748b' }}>
              {file ? '📁' : '☁️'}
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.3rem' }}>
              {file ? file.name : 'Cliquez ou glissez un fichier CSV / Excel ici'}
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB sélectionné` : 'Taille maximale recommandée : 10 Mo'}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={onSubmit}
              disabled={loading || !file}
              style={{
                padding: '1.1rem 3.5rem',
                fontSize: '1.15rem',
                fontWeight: 'bold',
                background: (loading || !file) ? 'rgba(148, 163, 184, 0.2)' : 'linear-gradient(135deg, #6366f1, #22c55e)',
                color: (loading || !file) ? '#94a3b8' : '#fff',
                border: 'none',
                borderRadius: '999px',
                cursor: (loading || !file) ? 'not-allowed' : 'pointer',
                boxShadow: (!loading && file) ? '0 12px 28px rgba(34, 197, 94, 0.3)' : 'none',
              }}
            >
              {loading ? 'Analyse en cours...' : 'Analyser le fichier'}
            </button>
          </div>
        </>
      )}

      {awaitingConfirmation && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.4rem' }}>
            Validation des colonnes à supprimer
          </h2>
          <p style={{ color: '#94a3b8', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            {suggestions?.summary || 'Sélectionnez les colonnes que vous souhaitez retirer avant l\'analyse.'}
          </p>

          {dataHealth && (
            <div style={{
              display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem',
            }}>
              <span style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '0.9rem' }}>
                {dataHealth.row_count} lignes
              </span>
              <span style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', background: 'rgba(34,197,94,0.15)', color: '#86efac', fontSize: '0.9rem' }}>
                {dataHealth.column_count} colonnes
              </span>
            </div>
          )}

          {suggestedColumns.length === 0 ? (
            <p style={{ color: '#86efac', padding: '1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '12px' }}>
              Aucune colonne inutile détectée. Vous pouvez continuer directement.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button type="button" onClick={selectHighConfidence} style={chipBtnStyle}>Sélectionner haute confiance</button>
                <button type="button" onClick={selectAllSuggested} style={chipBtnStyle}>Tout sélectionner</button>
                <button type="button" onClick={clearSelection} style={chipBtnStyle}>Tout désélectionner</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {suggestedColumns.map((col) => {
                  const conf = CONFIDENCE_LABELS[col.confidence] || CONFIDENCE_LABELS.low;
                  const checked = selectedDrops.has(col.name);
                  return (
                    <label
                      key={col.name}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.85rem',
                        padding: '1rem 1.1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: `1px solid ${checked ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.15)'}`,
                        background: checked ? 'rgba(34,197,94,0.06)' : 'rgba(30,41,59,0.5)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(col.name)}
                        style={{ marginTop: '0.25rem', accentColor: '#22c55e' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#f1f5f9' }}>{col.name}</strong>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.55rem',
                            borderRadius: '999px', color: conf.color, background: conf.bg,
                          }}>
                            {conf.label}
                          </span>
                        </div>
                        <p style={{ margin: '0.35rem 0 0', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
                          {col.reason}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSessionId(null);
                setDataHealth(null);
                setSuggestions(null);
                setSelectedDrops(new Set());
              }}
              style={{
                padding: '0.9rem 2rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.3)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 500,
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={{
                padding: '0.9rem 2.5rem', borderRadius: '999px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #22c55e)',
                color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
              }}
            >
              {selectedDrops.size > 0
                ? `Continuer (${selectedDrops.size} colonne${selectedDrops.size > 1 ? 's' : ''} à supprimer)`
                : 'Continuer sans suppression'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          marginTop: '2rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1.8rem',
          borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.2)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: '1rem',
            color: '#00ffd0', fontWeight: '500', fontSize: '1.1rem',
          }}>
            <span>{statusText}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #00ffd0)',
              transition: 'width 0.4s ease-out',
            }} />
          </div>
        </div>
      )}

      {message && (
        <div style={{
          marginTop: '2rem', padding: '1rem', borderRadius: '12px', textAlign: 'center', fontWeight: '500',
          background: message.type === 'err' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${message.type === 'err' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          color: message.type === 'err' ? '#fca5a5' : '#86efac',
        }}>
          {message.text}
        </div>
      )}
    </section>
  );
}

const chipBtnStyle = {
  padding: '0.4rem 0.85rem',
  borderRadius: '999px',
  border: '1px solid rgba(148,163,184,0.25)',
  background: 'rgba(30,41,59,0.6)',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontSize: '0.82rem',
};
