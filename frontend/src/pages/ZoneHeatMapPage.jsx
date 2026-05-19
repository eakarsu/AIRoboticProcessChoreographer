import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function ZoneHeatMapPage({ showToast }) {
  const [windowHours, setWindowHours] = useState(24);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/zone-heat-map', { windowHours: Number(windowHours) });
      setResult(res.data);
    } catch (err) {
      showToast?.('AI analysis failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Zone Heat Map</h1>
      </div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>🔥</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Zone Heat Map</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Identifies bottleneck zones using zones × tasks × collisions data.
        </p>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label style={styles.label}>Window (hours)</label>
            <input type="number" min="1" max="168" value={windowHours} onChange={e => setWindowHours(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Analyzing with AI...' : 'Generate Zone Heat Map'}
        </button>
      </div>

      {loading && (
        <div style={styles.loadingCard}>
          <div className="loading-spinner">AI is computing zone congestion...</div>
        </div>
      )}

      {result && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>Heat Map Analysis</h2>

          {Array.isArray(result.zones) && result.zones.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  <th style={styles.th}>Zone</th>
                  <th style={styles.th}>Heat</th>
                  <th style={styles.th}>Tasks</th>
                  <th style={styles.th}>Collisions</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.zones.map((z, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                    <td style={styles.td}>{z.name || z.zone || `Zone ${i + 1}`}</td>
                    <td style={styles.td}>{z.heat || z.severity || '-'}</td>
                    <td style={styles.td}>{z.task_count ?? z.tasks ?? '-'}</td>
                    <td style={styles.td}>{z.collision_count ?? z.collisions ?? '-'}</td>
                    <td style={styles.td}>{z.notes || z.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {result.result && (
            <div className="ai-content">
              <ReactMarkdown>{result.result}</ReactMarkdown>
            </div>
          )}

          {!result.result && !Array.isArray(result.zones) && (
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  infoCard: {
    background: 'linear-gradient(135deg, #1e293b, rgba(99, 102, 241, 0.08))',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '16px',
    padding: '32px',
  },
  loadingCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  th: { padding: '8px 12px', textAlign: 'left', color: '#94a3b8' },
  td: { padding: '8px 12px', color: '#e2e8f0' },
};

export default ZoneHeatMapPage;
