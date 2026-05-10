import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function DataSourcePage() {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const { setUploadResult } = useBiPlatform();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage({ type: 'err', text: 'Choisissez un fichier .csv ou .xlsx.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(apiUrl('/api/upload/'), {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.erreur || 'Échec du téléversement.' });
        setLoading(false);
        return;
      }
      setUploadResult({
        dataHealth: data.data_health ?? null,
        dashboard: data.dashboard ?? [],
      });
      if (data.erreur) {
        setMessage({ type: 'warn', text: data.erreur });
      } else {
        setMessage({ type: 'ok', text: 'Fichier ingéré et auto-analyse terminée.' });
      }
      navigate('/dashboard');
    } catch {
      setMessage({ type: 'err', text: 'Impossible de joindre le serveur.' });
    }
    setLoading(false);
  };

  return (
    <section className="bi-page">
      <h1>Source de données</h1>
      <p className="bi-lead">
        Téléversez un fichier CSV ou Excel. Les données sont chargées dans SQLite, puis
        l&apos;auto-analyse génère le tableau de bord global.
      </p>
      <form onSubmit={onSubmit} className="bi-form">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Traitement…' : 'Ingérer et analyser'}
        </button>
      </form>
      {message && (
        <p className={message.type === 'err' ? 'bi-error' : message.type === 'warn' ? 'bi-warn' : 'bi-success'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
