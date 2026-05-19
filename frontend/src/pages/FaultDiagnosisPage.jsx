import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function FaultDiagnosisPage({ showToast }) {
  const [robotId, setRobotId] = useState('');
  const [faultCode, setFaultCode] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [recentMaintenance, setRecentMaintenance] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!faultCode.trim() && !symptoms.trim()) {
      setError('Provide a fault code or symptoms.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await api.post('/ai/fault-diagnosis', {
        robotId: robotId ? Number(robotId) : undefined,
        faultCode,
        symptoms,
        recentMaintenance,
      });
      setResult(res.data);
    } catch (err) {
      const msg = 'AI analysis failed: ' + (err.response?.data?.error || err.message);
      setError(msg);
      showToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Fault Diagnosis</h1>
      </div>
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>🩺</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Fault Diagnosis</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
          Ranked-cause diagnosis with confirmation steps using fault code, symptoms, and recent maintenance.
        </p>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label style={styles.label}>Robot ID</label>
            <input type="number" value={robotId} onChange={e => setRobotId(e.target.value)} />
          </div>
          <div className="form-group">
            <label style={styles.label}>Fault Code</label>
            <input type="text" value={faultCode} onChange={e => setFaultCode(e.target.value)} placeholder="e.g. E-512" />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label style={styles.label}>Symptoms</label>
          <textarea rows={4} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="What's the robot doing or not doing?" />
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label style={styles.label}>Recent Maintenance</label>
          <textarea rows={3} value={recentMaintenance} onChange={e => setRecentMaintenance(e.target.value)} placeholder="Recent service, replaced parts, last calibration..." />
        </div>

        {error && <div style={{ color: '#fecaca', background: '#7f1d1d', padding: 10, borderRadius: 8, marginTop: 12 }}>{error}</div>}

        <button className="btn btn-primary btn-lg" onClick={run} disabled={loading} style={{ marginTop: 20, width: '100%' }}>
          {loading ? 'Analyzing with AI...' : 'Run Fault Diagnosis'}
        </button>
      </div>

      {loading && (
        <div style={styles.loadingCard}>
          <div className="loading-spinner">AI is diagnosing the fault...</div>
        </div>
      )}

      {result && (
        <div className="ai-result">
          <h2 style={{ marginBottom: 16 }}>Diagnosis</h2>

          {Array.isArray(result.causes) && result.causes.length > 0 && (
            <div>
              {result.causes.map((c, i) => (
                <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: '#a5b4fc' }}>{i + 1}. {c.cause || c.name || `Cause ${i + 1}`}</strong>
                    {c.probability != null && <span style={{ color: '#22c55e' }}>{c.probability}%</span>}
                  </div>
                  {c.description && <p style={{ color: '#cbd5e1', marginTop: 6 }}>{c.description}</p>}
                  {Array.isArray(c.confirmation_steps) && c.confirmation_steps.length > 0 && (
                    <ol style={{ paddingLeft: 20, color: '#cbd5e1', marginTop: 6 }}>
                      {c.confirmation_steps.map((s, j) => <li key={j}>{s}</li>)}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.result && (
            <div className="ai-content">
              <ReactMarkdown>{result.result}</ReactMarkdown>
            </div>
          )}

          {!result.result && !Array.isArray(result.causes) && (
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

export default FaultDiagnosisPage;
