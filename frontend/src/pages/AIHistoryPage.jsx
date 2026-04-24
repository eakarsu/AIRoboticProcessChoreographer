import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function AIHistoryPage() {
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/ai/history');
        setHistory(res.data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const featureColors = {
    'task-allocation': '#6366f1',
    'collision-avoidance': '#ef4444',
    'path-planning': '#0ea5e9',
    'throughput-optimization': '#f59e0b',
    'predictive-maintenance': '#8b5cf6',
    'demand-forecast': '#10b981',
    'simulation': '#06b6d4',
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Analysis History</h1>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="empty-state"><p>No AI analyses yet. Run an AI feature to see results here.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map(item => (
            <div
              key={item.id}
              style={{
                background: '#1e293b',
                border: `1px solid ${expanded === item.id ? featureColors[item.feature] || '#334155' : '#334155'}`,
                borderRadius: '12px',
                overflow: 'hidden',
                borderLeft: `4px solid ${featureColors[item.feature] || '#6366f1'}`,
              }}
            >
              <div
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge badge-primary">{item.feature.replace(/-/g, ' ')}</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{item.model_used}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                  <span>{item.tokens_used} tokens</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span style={{ fontSize: '16px' }}>{expanded === item.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === item.id && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #334155' }}>
                  <div className="ai-content" style={{ marginTop: '16px' }}>
                    <ReactMarkdown>{item.result}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AIHistoryPage;
