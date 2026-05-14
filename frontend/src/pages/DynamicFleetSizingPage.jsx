import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function DynamicFleetSizingPage({ showToast }) {
  const [horizonHours, setHorizonHours] = useState(24);
  const [expectedRate, setExpectedRate] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const body = { horizon_hours: Number(horizonHours) };
      if (expectedRate) body.expected_task_rate_per_hour = Number(expectedRate);
      const res = await api.post('/ai/dynamic-fleet-sizing', body);
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
      <div className="page-header"><h1>AI Dynamic Fleet Sizing</h1></div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>📐</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Optimal Fleet Size Recommendation</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Recommends scale-up / scale-down / hold for the fleet over a configurable horizon, factoring current robot mix, task backlog, and zone capacity.
        </p>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          <div>
            <label style={styles.label}>Horizon (hours)</label>
            <input type="number" min="1" max="168" value={horizonHours} onChange={e => setHorizonHours(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Expected task rate / hour (optional)</label>
            <input type="number" min="0" value={expectedRate} onChange={e => setExpectedRate(e.target.value)} placeholder="e.g., 60" />
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Sizing fleet...' : 'Recommend Fleet Size'}
        </button>
      </div>

      {loading && <div style={styles.loadingCard}><div className="loading-spinner">AI is sizing the fleet...</div></div>}
      {error && <div style={styles.errorCard}>{error}</div>}

      {result && !error && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>Fleet Sizing Plan</h2>
          {result.result_json && (
            <>
              <div style={styles.scoreCard}>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommended Fleet Size</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: '#a5b4fc' }}>
                  {result.result_json.recommended_fleet_size ?? '-'}
                  <span style={{ fontSize: 16, color: '#64748b' }}> (current: {result.result_json.current_fleet_size ?? '-'})</span>
                </div>
                <div style={{ color: '#cbd5e1', marginTop: 6 }}>Strategy: {result.result_json.sizing_strategy || '-'} | Gap: {result.result_json.sizing_gap ?? '-'}</div>
              </div>
              {Array.isArray(result.result_json.per_type_recommendations) && result.result_json.per_type_recommendations.length > 0 && (
                <table style={styles.table}>
                  <thead><tr style={{ background: '#1e293b' }}>
                    <th style={styles.th}>Type</th><th style={styles.th}>Target</th><th style={styles.th}>Current</th><th style={styles.th}>Reason</th>
                  </tr></thead>
                  <tbody>
                    {result.result_json.per_type_recommendations.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                        <td style={styles.td}>{r.type}</td>
                        <td style={styles.td}>{r.target_count}</td>
                        <td style={styles.td}>{r.current_count}</td>
                        <td style={styles.td}>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
          {result.result && <div className="ai-content"><ReactMarkdown>{result.result}</ReactMarkdown></div>}
          {!result.result && !result.result_json && <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}

const styles = {
  infoCard: { background: 'linear-gradient(135deg, #1e293b, rgba(99, 102, 241, 0.08))', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '16px', padding: '32px' },
  loadingCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginTop: '24px' },
  errorCard: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '16px', marginTop: '24px', color: '#fca5a5', fontSize: 14 },
  scoreCard: { background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 },
  th: { padding: '8px 12px', textAlign: 'left', color: '#94a3b8' },
  td: { padding: '8px 12px', color: '#e2e8f0' },
};

export default DynamicFleetSizingPage;
