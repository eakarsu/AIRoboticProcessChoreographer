import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

const featureInfo = {
  'task-allocation': {
    icon: '🎯',
    description: 'Analyzes your robot fleet and pending tasks to generate optimal task-to-robot assignments based on battery levels, payload capacity, proximity, and deadlines.',
    inputs: null,
  },
  'collision-avoidance': {
    icon: '🛡️',
    description: 'Analyzes current robot positions, zone layout, and collision history to identify risks and suggest path adjustments and speed limits.',
    inputs: null,
  },
  'path-planning': {
    icon: '🗺️',
    description: 'Plans optimal navigation routes for a specific robot considering zone congestion, distance, and active robot positions.',
    inputs: [
      { key: 'robotId', label: 'Robot ID', type: 'number', placeholder: 'e.g., 1' },
      { key: 'sourceZoneId', label: 'Source Zone ID', type: 'number', placeholder: 'e.g., 1' },
      { key: 'destZoneId', label: 'Destination Zone ID', type: 'number', placeholder: 'e.g., 9' },
    ],
  },
  'throughput-optimization': {
    icon: '⚡',
    description: 'Analyzes current robot fleet, task queue, zones, and shifts to identify bottlenecks and recommend throughput improvements.',
    inputs: null,
  },
  'predictive-maintenance': {
    icon: '🔮',
    description: 'Predicts which robots need maintenance soon based on battery degradation, usage patterns, and maintenance history.',
    inputs: null,
  },
  'demand-forecast': {
    icon: '📈',
    description: 'Forecasts upcoming warehouse demand patterns including peak hours, task volumes, and recommended staffing levels.',
    inputs: null,
  },
  'simulation': {
    icon: '🎮',
    description: 'Simulates warehouse scenarios with customizable parameters and provides detailed performance metrics and recommendations.',
    inputs: [
      { key: 'scenario', label: 'Scenario', type: 'text', placeholder: 'e.g., Peak holiday season with 3x order volume' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g., 8 hours' },
      { key: 'robotCount', label: 'Robot Count', type: 'number', placeholder: 'e.g., 15' },
    ],
  },
};

function AIFeaturePage({ feature, title, showToast }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputData, setInputData] = useState({});
  const info = featureInfo[feature];

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = info.inputs ? inputData : {};
      const res = await api.post(`/ai/${feature}`, payload);
      setResult(res.data);
    } catch (err) {
      showToast('AI analysis failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
      </div>

      <div style={styles.infoCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ fontSize: '48px' }}>{info.icon}</span>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{title}</h2>
            <span className="badge badge-primary">OpenRouter AI</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7' }}>{info.description}</p>

        {info.inputs && (
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {info.inputs.map(input => (
              <div key={input.key} className="form-group">
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {input.label}
                </label>
                <input
                  type={input.type}
                  placeholder={input.placeholder}
                  value={inputData[input.key] || ''}
                  onChange={e => setInputData({ ...inputData, [input.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          onClick={handleRun}
          disabled={loading}
          style={{ marginTop: '20px', width: '100%' }}
        >
          {loading ? 'Analyzing with AI...' : `Run ${title}`}
        </button>
      </div>

      {loading && (
        <div style={styles.loadingCard}>
          <div className="loading-spinner">AI is analyzing your warehouse data...</div>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', paddingLeft: '36px' }}>
            This may take a few seconds. The AI is processing real data from your database.
          </p>
        </div>
      )}

      {result && (
        <div className="ai-result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>AI Analysis Results</h2>
            {result.usage && (
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                <span>Tokens: {result.usage.total_tokens?.toLocaleString()}</span>
                <span>Model: {result.usage.model || 'claude-haiku'}</span>
              </div>
            )}
          </div>
          <div className="ai-content">
            <ReactMarkdown>{result.result}</ReactMarkdown>
          </div>
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
};

export default AIFeaturePage;
