import React, { useEffect, useState } from 'react';
import api from '../api';

const EVENT_COLORS = {
  task_started:   '#38bdf8',
  task_completed: '#22c55e',
  task_failed:    '#ef4444',
  charging:       '#eab308',
  maintenance:    '#a855f7',
  idle:           '#64748b',
};

function BotActivityTimeline() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/custom-views/bot-activity-timeline');
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading bot activity timeline...</div>;
  if (err) return <div style={{ color: '#f87171' }}>Error: {err}</div>;
  if (!data || !data.events || data.events.length === 0) {
    return <div style={{ color: '#94a3b8' }}>No activity events.</div>;
  }

  const tsList = data.events.map(e => new Date(e.timestamp).getTime());
  const minT = Math.min(...tsList);
  const maxT = Math.max(...tsList);
  const span = Math.max(1, maxT - minT);
  const bots = data.bots || [];

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e5e7eb', margin: '0 0 4px 0', fontSize: 18 }}>Bot Activity Timeline</h3>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>
        {data.events.length} events across {bots.length} bots (last 14d)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
        {bots.map(bot => {
          const rowEvents = data.events.filter(e => e.bot_id === bot.id);
          return (
            <React.Fragment key={bot.id}>
              <div style={{ color: '#cbd5e1', fontSize: 12, padding: '6px 8px' }}>{bot.name}</div>
              <div
                style={{
                  position: 'relative',
                  height: 28,
                  background: '#111827',
                  borderRadius: 6,
                  border: '1px solid #1f2937',
                }}
              >
                {rowEvents.map((e, i) => {
                  const t = new Date(e.timestamp).getTime();
                  const leftPct = ((t - minT) / span) * 100;
                  return (
                    <div
                      key={i}
                      title={`${e.event} @ ${new Date(e.timestamp).toLocaleString()} (${e.duration_sec}s)`}
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        top: 4,
                        bottom: 4,
                        width: 6,
                        background: EVENT_COLORS[e.event] || '#94a3b8',
                        borderRadius: 2,
                      }}
                    />
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
        {Object.entries(EVENT_COLORS).map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 11 }}>
            <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: 'inline-block' }} />
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BotActivityTimeline;
