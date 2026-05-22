import React, { useEffect, useState } from 'react';
import api from '../api';

function cellColor(value, max) {
  if (!value) return '#111827';
  const t = Math.min(1, value / Math.max(1, max));
  // interpolate dark slate → red
  const r = Math.round(30 + (239 - 30) * t);
  const g = Math.round(41 + (68 - 41) * t);
  const b = Math.round(59 + (68 - 59) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function TaskErrorHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/custom-views/task-error-heatmap');
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading task error heatmap...</div>;
  if (err) return <div style={{ color: '#f87171' }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#94a3b8' }}>No data.</div>;

  const max = data.matrix.reduce(
    (m, row) => Math.max(m, ...Object.values(row.errors)),
    1
  );

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e5e7eb', margin: '0 0 4px 0', fontSize: 18 }}>Task Error Heatmap</h3>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>
        Bot × Task-type error counts (peak {max})
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, color: '#e5e7eb', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#94a3b8' }}>Bot \ Task</th>
              {data.task_types.map(tt => (
                <th key={tt} style={{ padding: '6px 8px', color: '#94a3b8', fontWeight: 600 }}>{tt}</th>
              ))}
              <th style={{ padding: '6px 8px', color: '#94a3b8' }}>total</th>
            </tr>
          </thead>
          <tbody>
            {data.matrix.map(row => (
              <tr key={row.bot_id}>
                <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{row.bot_name}</td>
                {data.task_types.map(tt => {
                  const v = row.errors[tt] || 0;
                  return (
                    <td
                      key={tt}
                      title={`${row.bot_name} / ${tt}: ${v} errors`}
                      style={{
                        background: cellColor(v, max),
                        color: v > max * 0.6 ? '#fff' : '#cbd5e1',
                        padding: '8px 12px',
                        borderRadius: 6,
                        textAlign: 'center',
                        minWidth: 44,
                        border: '1px solid #1f2937',
                      }}
                    >
                      {v}
                    </td>
                  );
                })}
                <td style={{ padding: '6px 8px', color: '#a5b4fc', fontWeight: 700 }}>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TaskErrorHeatmap;
