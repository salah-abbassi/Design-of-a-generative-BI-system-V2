import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import { useBiPlatform } from '../context/BiPlatformContext';

export default function DataSourcePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [message, setMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { setUploadResult } = useBiPlatform();
  const navigate = useNavigate();

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
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
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

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(apiUrl('/api/upload/'), {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setMessage({ type: 'err', text: errorData?.erreur || 'Échec du téléversement.' });
        setLoading(false);
        return;
      }

      // Read streaming NDJSON response
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in buffer
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.erreur) {
              setMessage({ type: 'err', text: data.erreur });
              setLoading(false);
              return;
            }
            
            if (data.progress !== undefined) {
              setProgress(data.progress);
            }
            
            if (data.step === 'ingestion') setStatusText('Lecture et ingestion du fichier...');
            if (data.step === 'explanation') setStatusText('Génération de l\'explication métier...');
            if (data.step === 'analyst') setStatusText('Analyse des KPIs potentiels...');
            if (data.step === 'engineer') setStatusText('Génération des requêtes SQL...');
            if (data.step === 'designer') setStatusText('Conception du tableau de bord...');
            
            if (data.step === 'done') {
              setStatusText('Terminé !');
              setUploadResult({
                dataHealth: data.data_health ?? null,
                dashboard: data.dashboard ?? [],
              });
              setMessage({ type: 'ok', text: 'Fichier ingéré et auto-analyse terminée.' });
              setTimeout(() => navigate('/dashboard'), 800);
              return;
            }
          } catch (e) {
            console.error('Erreur parsing JSON ligne:', line, e);
          }
        }
      }
    } catch {
      setMessage({ type: 'err', text: 'Impossible de joindre le serveur ou erreur de lecture.' });
      setLoading(false);
    }
  };

  return (
    <section className="bi-page" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.8rem', background: 'linear-gradient(to right, #6366f1, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>
          Connectez vos données
        </h1>
        <p className="bi-lead" style={{ margin: '0 auto', fontSize: '1.1rem' }}>
          Déposez simplement votre fichier. Nos agents IA s'occupent de comprendre votre métier, d'extraire les KPIs pertinents et de construire votre dashboard sur mesure.
        </p>
      </div>

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
          position: 'relative'
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
            cursor: loading ? 'default' : 'pointer'
          }}
        />
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: isDragging ? '#22c55e' : '#64748b' }}>
          {file ? '📁' : '☁️'}
        </div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.3rem' }}>
          {file ? file.name : 'Cliquez ou glissez un fichier CSV / Excel ici'}
        </h3>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB sélectionné` : 'Taille maximale recommandée : 50 MB'}
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
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? 'Traitement par IA en cours...' : 'Générer le Dashboard'}
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: '3rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1.8rem', borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#00ffd0', fontWeight: '500', fontSize: '1.1rem' }}>
            <span>{statusText}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${progress}%`, 
                background: 'linear-gradient(90deg, #6366f1, #00ffd0)', 
                transition: 'width 0.4s ease-out',
                boxShadow: '0 0 15px rgba(0, 241, 92, 0.6)'
              }} 
            />
          </div>
        </div>
      )}

      {message && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          borderRadius: '12px', 
          textAlign: 'center',
          fontWeight: '500',
          background: message.type === 'err' ? 'rgba(239, 68, 68, 0.15)' : message.type === 'warn' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${message.type === 'err' ? 'rgba(239, 68, 68, 0.3)' : message.type === 'warn' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          color: message.type === 'err' ? '#fca5a5' : message.type === 'warn' ? '#fcd34d' : '#86efac'
        }}>
          {message.text}
        </div>
      )}
    </section>
  );
}
