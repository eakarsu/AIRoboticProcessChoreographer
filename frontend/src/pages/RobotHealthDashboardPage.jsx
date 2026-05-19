import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function RobotHealthDashboardPage({ showToast }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.post('/ai/robot-health-dashboard', {});
      setResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message;
      const friendly = status === 503 ? `AI service unavailable: ${msg}` : msg;
      setError(friendly);
      showToast?.('AI analysis failed: ' + friendly, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Robot Health Dashboard</h1>
      </div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>🩺</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Fleet Health Dashboard</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Aggregates per-robot telemetry (battery, status, maintenance history, collisions, task counts) into a fleet-level health score with risk ranking and prioritized maintenance actions.
        </p>

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Analyzing fleet...' : 'Run Health Dashboard'}
        </button>
      </div>

      {loading && (
        <div style={styles.loadingCard}>
          <div className="loading-spinner">AI is aggregating fleet telemetry...</div>
        </div>
      )}

      {error && (
        <div style={styles.errorCard}>
          {error}
        </div>
      )}

      {result && !error && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>Fleet Health Analysis</h2>

          {result.result_json && (
            <>
              {typeof result.result_json.fleet_health_score === 'number' && (
                <div style={styles.scoreCard}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fleet Health Score</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: '#a5b4fc' }}>{result.result_json.fleet_health_score}<span style={{ fontSize: 18, color: '#64748b' }}> / 100</span></div>
                  {result.result_json.fleet_summary && <div style={{ color: '#cbd5e1', marginTop: 6 }}>{result.result_json.fleet_summary}</div>}
                </div>
              )}

              {Array.isArray(result.result_json.robots) && result.result_json.robots.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      <th style={styles.th}>Robot</th>
                      <th style={styles.th}>Health</th>
                      <th style={styles.th}>Risk</th>
                      <th style={styles.th}>Issues</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.result_json.robots.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                        <td style={styles.td}>{r.name || `#${r.id}`}</td>
                        <td style={styles.td}>{r.health_score ?? '-'}</td>
                        <td style={styles.td}>{r.risk_level || '-'}</td>
                        <td style={styles.td}>{(r.issues || []).join(', ') || '-'}</td>
                        <td style={styles.td}>{(r.recommended_actions || []).join('; ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {result.result && (
            <div className="ai-content">
              <ReactMarkdown>{result.result}</ReactMarkdown>
            </div>
          )}

          {!result.result && !result.result_json && (
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
  errorCard: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '24px',
    color: '#fca5a5',
    fontSize: 14,
  },
  scoreCard: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  th: { padding: '8px 12px', textAlign: 'left', color: '#94a3b8' },
  td: { padding: '8px 12px', color: '#e2e8f0' },
};

export default RobotHealthDashboardPage;
