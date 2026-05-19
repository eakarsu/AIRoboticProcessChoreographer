import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function ZoneCapacityForecastPage({ showToast }) {
  const [horizonHours, setHorizonHours] = useState(12);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.post('/ai/zone-capacity-forecast', { horizon_hours: Number(horizonHours) });
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
      <div className="page-header"><h1>AI Zone Capacity Forecast</h1></div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>📊</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Per-Zone Congestion Forecast</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Predicts per-zone peak utilisation over a configurable horizon and proposes a rebalancing plan.
        </p>

        <div style={{ marginTop: 20 }}>
          <label style={styles.label}>Horizon (hours)</label>
          <input type="number" min="1" max="72" value={horizonHours} onChange={e => setHorizonHours(e.target.value)} />
        </div>

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Forecasting...' : 'Run Capacity Forecast'}
        </button>
      </div>

      {loading && <div style={styles.loadingCard}><div className="loading-spinner">AI is forecasting zone congestion...</div></div>}
      {error && <div style={styles.errorCard}>{error}</div>}

      {result && !error && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>Forecast</h2>
          {result.result_json && Array.isArray(result.result_json.zones) && result.result_json.zones.length > 0 && (
            <table style={styles.table}>
              <thead><tr style={{ background: '#1e293b' }}>
                <th style={styles.th}>Zone</th><th style={styles.th}>Now %</th><th style={styles.th}>Peak %</th><th style={styles.th}>Peak in (h)</th><th style={styles.th}>Risk</th><th style={styles.th}>Actions</th>
              </tr></thead>
              <tbody>
                {result.result_json.zones.map((z, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                    <td style={styles.td}>{z.name || `#${z.zone_id}`}</td>
                    <td style={styles.td}>{z.current_utilisation_pct ?? '-'}</td>
                    <td style={styles.td}>{z.forecast_peak_utilisation_pct ?? '-'}</td>
                    <td style={styles.td}>{z.forecast_peak_in_hours ?? '-'}</td>
                    <td style={styles.td}>{z.risk_level || '-'}</td>
                    <td style={styles.td}>{(z.recommended_actions || []).join('; ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 },
  th: { padding: '8px 12px', textAlign: 'left', color: '#94a3b8' },
  td: { padding: '8px 12px', color: '#e2e8f0' },
};

export default ZoneCapacityForecastPage;
