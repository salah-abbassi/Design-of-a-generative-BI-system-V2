import { DashboardGrid } from '../components/DashboardGrid';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function ChatPage({ messages, question, setQuestion, isSending, askAi }) {
  const { chatDashboard } = useBiPlatform();

  return (
    <section className="bi-page" style={{ paddingBottom: '140px' }}>
      <div className="bi-chat-full-container" style={{ background: 'rgba(15, 23, 42, 0.2)', borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.1)', padding: '1.5rem', minHeight: '50vh' }}>
        <div className="bi-chat-full-messages" style={{ display: 'flex', flexDirection: 'column' }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === 'user' ? 'bi-message bi-message-user' : 'bi-message bi-message-ai'}
              style={{ 
                maxWidth: '85%', 
                margin: message.role === 'user' ? '0 0 1.5rem auto' : '0 auto 1.5rem 0', 
                fontSize: '1.05rem', 
                padding: '1.2rem 1.5rem',
                lineHeight: '1.6'
              }}
            >
              {message.text}
            </div>
          ))}
          {chatDashboard?.length > 0 && (
            <div className="bi-chat-dashboard-preview" style={{ marginTop: '2rem', padding: '1rem', background: '#0f172a', borderRadius: '12px' }}>
              <DashboardGrid items={chatDashboard} />
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem 2rem 2rem', background: 'linear-gradient(to top, rgba(14, 20, 33, 1) 60%, rgba(14, 20, 33, 0))', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '850px', background: 'rgba(30, 41, 59, 0.95)', padding: '0.5rem', borderRadius: '32px', border: '1px solid rgba(148, 163, 184, 0.3)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Posez une question à l'assistant IA..."
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') askAi();
            }}
            style={{ 
              flex: 1, 
              padding: '0.8rem 1.2rem', 
              background: 'transparent', 
              border: 'none',
              color: '#f8fafc',
              fontSize: '1.05rem',
              outline: 'none'
            }}
          />
          <button 
            type="button" 
            onClick={askAi} 
            disabled={isSending || !question.trim()}
            style={{ 
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (!isSending && question.trim()) ? 'linear-gradient(135deg, #00f15c, #00ffd0)' : 'rgba(148, 163, 184, 0.2)', 
              color: (!isSending && question.trim()) ? '#0f172a' : '#94a3b8', 
              border: 'none', 
              cursor: (!isSending && question.trim()) ? 'pointer' : 'default',
              transition: 'all 0.2s',
              fontSize: '1.2rem'
            }}
            title="Envoyer"
          >
            {isSending ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </section>
  );
}
