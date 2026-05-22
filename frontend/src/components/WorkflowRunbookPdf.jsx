import React, { useEffect, useState } from 'react';
import api from '../api';

function WorkflowRunbookPdf() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [workflowId, setWorkflowId] = useState('default');

  const load = async (id) => {
    setLoading(true);
    setErr('');
    try {
      const r = await api.get(`/custom-views/workflow-runbook-pdf?workflow_id=${encodeURIComponent(id)}`);
      setData(r.data);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(workflowId); /* eslint-disable-next-line */ }, []);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${data?.title || 'Runbook'}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 32px; color: #111; max-width: 780px; margin: auto; }
        h1 { border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
        h2 { color: #4f46e5; margin-top: 24px; }
        pre, .body { white-space: pre-wrap; line-height: 1.5; }
      </style></head><body>
      <h1>${data?.title || 'Runbook'}</h1>
      <p><em>${data?.generated_at || ''}</em></p>
      ${(data?.sections || []).map(s => `<h2>${s.heading}</h2><div class="body">${(s.body || '').replace(/\n/g, '<br/>')}</div>`).join('')}
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e5e7eb', margin: '0 0 12px 0', fontSize: 18 }}>Workflow Runbook (PDF)</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={workflowId}
          onChange={e => setWorkflowId(e.target.value)}
          placeholder="workflow id"
          style={{
            background: '#111827', border: '1px solid #334155', borderRadius: 6,
            color: '#e5e7eb', padding: '6px 10px', fontSize: 12, minWidth: 180,
          }}
        />
        <button
          onClick={() => load(workflowId)}
          style={{
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >Reload</button>
        <button
          onClick={handlePrint}
          disabled={!data}
          style={{
            background: '#0ea5e9', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >Print / Save as PDF</button>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading runbook...</div>}
      {err && <div style={{ color: '#f87171' }}>Error: {err}</div>}

      {data && !loading && (
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 16 }}>
          <h4 style={{ color: '#a5b4fc', marginTop: 0 }}>{data.title}</h4>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 10 }}>
            generated {data.generated_at} · {data.task_count} steps
          </div>
          {(data.sections || []).map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.heading}</div>
              <pre style={{
                background: '#0f172a', color: '#cbd5e1', fontSize: 12,
                padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0,
                fontFamily: 'inherit',
              }}>{s.body}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkflowRunbookPdf;
