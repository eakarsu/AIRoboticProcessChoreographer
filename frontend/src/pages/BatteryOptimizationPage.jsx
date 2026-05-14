import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function BatteryOptimizationPage({ showToast }) {
  const [horizonHours, setHorizonHours] = useState(8);
  const [chargingStations, setChargingStations] = useState(4);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/battery-optimization', {
        horizonHours: Number(horizonHours),
        chargingStations: Number(chargingStations),
      });
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
        <h1>AI Battery Optimization</h1>
      </div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>🔋</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Battery Optimization</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Generates a charge schedule across the fleet over an N-hour horizon, minimizing queue collisions and avoidable idle time.
        </p>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label style={styles.label}>Horizon (hours)</label>
            <input type="number" min="1" max="48" value={horizonHours} onChange={e => setHorizonHours(e.target.value)} />
          </div>
          <div className="form-group">
            <label style={styles.label}>Charging Stations</label>
            <input type="number" min="1" max="50" value={chargingStations} onChange={e => setChargingStations(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Analyzing with AI...' : 'Run Battery Optimization'}
        </button>
      </div>

      {loading && (
        <div style={styles.loadingCard}>
          <div className="loading-spinner">AI is analyzing battery telemetry...</div>
        </div>
      )}

      {result && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>AI Analysis Results</h2>
          {result.result && (
            <div className="ai-content">
              <ReactMarkdown>{result.result}</ReactMarkdown>
            </div>
          )}
          {!result.result && (
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
};

export default BatteryOptimizationPage;
