import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import DataSourcePage from './pages/DataSourcePage';
import GlobalDashboardPage from './pages/GlobalDashboardPage';
import { apiUrl } from './api';
import { DashboardGrid } from './components/DashboardGrid';
import { useBiPlatform } from './context/BiPlatformContext';

function App() {
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Bonjour. Posez votre question métier ici et je génère les KPIs et graphiques.',
    },
  ]);
  const { chatDashboard, setChatDashboard } = useBiPlatform();

  const askAi = async () => {
    const q = question.trim();
    if (!q || isSending) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setIsSending(true);
    try {
      const response = await fetch(apiUrl('/api/generate/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: data.erreur || "Je n'ai pas pu traiter la demande." },
        ]);
      } else {
        const dashboardItems = data.dashboard ?? [];
        setChatDashboard(dashboardItems);
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text:
              dashboardItems.length > 0
                ? 'Analyse terminée. Les résultats sont affichés ci-dessous.'
                : 'Analyse terminée, mais aucun widget exploitable n’a été généré.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: "Erreur de connexion avec l'API backend." },
      ]);
    }
    setIsSending(false);
  };

  return (
    <div className="bi-shell">
      <div className="bi-aurora bi-aurora-a" />
      <div className="bi-aurora bi-aurora-b" />
      <div className="bi-aurora bi-aurora-c" />

      <div className="bi-app">
        <header className="bi-header">
          <div className="bi-brand-wrap">
            <div className="bi-brand-mark" aria-hidden="true" />
            <div>
              <p className="bi-brand">BI Intelligence Platform</p>
              <p className="bi-brand-subtitle">Analytics moderne propulsé par IA</p>
            </div>
          </div>
          <div className="bi-header-actions">
            <nav className="bi-nav">
              <NavLink
                to="/upload"
                className={({ isActive }) => (isActive ? 'bi-nav-link active' : 'bi-nav-link')}
              >
                Source de donnees
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'bi-nav-link active' : 'bi-nav-link')}
              >
                Tableau de bord
              </NavLink>
            </nav>
            <button
              type="button"
              className="bi-header-chat-btn"
              onClick={() => setIsMessengerOpen(true)}
            >
              Ouvrir Assistant IA
            </button>
          </div>
        </header>
        <main className="bi-main">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<DataSourcePage />} />
            <Route path="/dashboard" element={<GlobalDashboardPage />} />
            <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {isMessengerOpen && (
        <aside className="bi-messenger-panel">
          <div className="bi-messenger-header">
            <div>
              <p className="bi-messenger-title">Assistant BI</p>
              <p className="bi-messenger-subtitle">Discussion rapide</p>
            </div>
            <button
              type="button"
              className="bi-messenger-close"
              onClick={() => setIsMessengerOpen(false)}
              aria-label="Fermer le chat"
            >
              ×
            </button>
          </div>
          <div className="bi-messenger-body">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === 'user' ? 'bi-message bi-message-user' : 'bi-message bi-message-ai'}
              >
                {message.text}
              </div>
            ))}
            {chatDashboard?.length > 0 && (
              <div className="bi-chat-dashboard-preview">
                <DashboardGrid items={chatDashboard} />
              </div>
            )}
          </div>
          <div className="bi-messenger-footer">
            <div className="bi-messenger-input-wrap">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: région avec la plus grande quantité vendue"
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') askAi();
                }}
              />
              <button type="button" className="bi-messenger-action" onClick={askAi} disabled={isSending}>
                {isSending ? 'Analyse...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </aside>
      )}

      <button
        type="button"
        className="bi-fab"
        onClick={() => setIsMessengerOpen((v) => !v)}
        aria-label="Ouvrir le chat lateral"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2h11A3.5 3.5 0 0 1 21 5.5v7A3.5 3.5 0 0 1 17.5 16H11l-4.5 4v-4H6.5A3.5 3.5 0 0 1 3 12.5z" />
        </svg>
      </button>
    </div>
  );
}

export default App;
