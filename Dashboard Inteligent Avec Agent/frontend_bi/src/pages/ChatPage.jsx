import { useState } from 'react';
import { apiUrl } from '../api';
import { DashboardGrid } from '../components/DashboardGrid';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function ChatPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { chatDashboard, setChatDashboard } = useBiPlatform();

  const genererDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/generate/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.erreur || 'Erreur API');
        setLoading(false);
        return;
      }
      setChatDashboard(data.dashboard ?? []);
    } catch {
      setError("Erreur de connexion avec l'API");
    }
    setLoading(false);
  };

  return (
    <section className="bi-page bi-page-left">
      <h1>Data Studio (chat IA)</h1>
      <p className="bi-lead">
        Posez une question en langage naturel : les agents traduisent en SQL et composent le
        tableau de bord.
      </p>
      <div className="bi-chat-bar">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex. : total des ventes et répartition par région…"
          disabled={loading}
        />
        <button type="button" onClick={genererDashboard} disabled={loading}>
          {loading ? 'Génération…' : 'Analyser'}
        </button>
      </div>
      {error && <p className="bi-error">{error}</p>}
      <DashboardGrid items={chatDashboard || []} />
    </section>
  );
}
