import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function ChargingOrchestrationPage({ showToast }) {
  const [minBattery, setMinBattery] = useState(25);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.post('/ai/charging-orchestration', { min_battery_pct: Number(minBattery) });
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
      <div className="page-header"><h1>AI Charging Orchestration</h1></div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>⚡</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Autonomous Charging Schedule</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Generates an immediate + scheduled charging plan that respects station capacity and active task queues.
        </p>

        <div style={{ marginTop: 20 }}>
          <label style={styles.label}>Critical battery threshold (%)</label>
          <input type="number" min="5" max="50" value={minBattery} onChange={e => setMinBattery(e.target.value)} />
        </div>

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Orchestrating...' : 'Build Charging Plan'}
        </button>
      </div>

      {loading && <div style={styles.loadingCard}><div className="loading-spinner">AI is orchestrating charging...</div></div>}
      {error && <div style={styles.errorCard}>{error}</div>}

      {result && !error && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>Charging Plan</h2>
          {result.result_json && (
            <>
              {Array.isArray(result.result_json.immediate_charges) && result.result_json.immediate_charges.length > 0 && (
                <>
                  <h3 style={styles.h3}>Immediate Charges</h3>
                  <table style={styles.table}>
                    <thead><tr style={{ background: '#1e293b' }}>
                      <th style={styles.th}>Robot</th><th style={styles.th}>Station</th><th style={styles.th}>Reason</th>
                    </tr></thead>
                    <tbody>
                      {result.result_json.immediate_charges.map((c, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                          <td style={styles.td}>#{c.robot_id}</td>
                          <td style={styles.td}>#{c.station_id}</td>
                          <td style={styles.td}>{c.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {Array.isArray(result.result_json.scheduled_charges) && result.result_json.scheduled_charges.length > 0 && (
                <>
                  <h3 style={styles.h3}>Scheduled Charges</h3>
                  <table style={styles.table}>
                    <thead><tr style={{ background: '#1e293b' }}>
                      <th style={styles.th}>Robot</th><th style={styles.th}>Station</th><th style={styles.th}>Start (min)</th><th style={styles.th}>Duration</th><th style={styles.th}>Reason</th>
                    </tr></thead>
                    <tbody>
                      {result.result_json.scheduled_charges.map((c, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                          <td style={styles.td}>#{c.robot_id}</td>
                          <td style={styles.td}>#{c.station_id}</td>
                          <td style={styles.td}>{c.start_offset_min}</td>
                          <td style={styles.td}>{c.duration_min}</td>
                          <td style={styles.td}>{c.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
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
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  h3: { fontSize: 14, color: '#cbd5e1', marginTop: 12, marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 },
  th: { padding: '8px 12px', textAlign: 'left', color: '#94a3b8' },
  td: { padding: '8px 12px', color: '#e2e8f0' },
};

export default ChargingOrchestrationPage;
