import React, { useEffect, useState } from 'react';
import api from '../api';

const empty = {
  rule_name: '',
  bot_id: '',
  trigger_type: 'cron',
  trigger_expr: '0 * * * *',
  schedule: '',
  enabled: true,
  notes: '',
};

function BotScheduleRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/custom-views/bot-schedule-rules');
      setRules(r.data.rules || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm(empty); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const payload = {
        ...form,
        bot_id: form.bot_id === '' ? null : Number(form.bot_id),
      };
      if (editId) {
        await api.put(`/custom-views/bot-schedule-rules/${editId}`, payload);
      } else {
        await api.post('/custom-views/bot-schedule-rules', payload);
      }
      reset();
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (r) => {
    setEditId(r.id);
    setForm({
      rule_name: r.rule_name || '',
      bot_id: r.bot_id ?? '',
      trigger_type: r.trigger_type || 'cron',
      trigger_expr: r.trigger_expr || '',
      schedule: r.schedule || '',
      enabled: !!r.enabled,
      notes: r.notes || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await api.delete(`/custom-views/bot-schedule-rules/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  const inp = {
    background: '#111827', border: '1px solid #334155', borderRadius: 6,
    color: '#e5e7eb', padding: '6px 10px', fontSize: 12,
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e5e7eb', margin: '0 0 12px 0', fontSize: 18 }}>Bot Scheduling Rules</h3>

      {err && <div style={{ color: '#f87171', marginBottom: 10, fontSize: 12 }}>{err}</div>}

      <form onSubmit={handleSubmit}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16,
          background: '#111827', padding: 12, borderRadius: 8, border: '1px solid #1f2937',
        }}>
        <input style={inp} placeholder="Rule name *" value={form.rule_name}
          onChange={e => setForm({ ...form, rule_name: e.target.value })} required />
        <input style={inp} placeholder="Bot ID (optional)" type="number" value={form.bot_id}
          onChange={e => setForm({ ...form, bot_id: e.target.value })} />
        <select style={inp} value={form.trigger_type}
          onChange={e => setForm({ ...form, trigger_type: e.target.value })}>
          <option value="cron">cron</option>
          <option value="event">event</option>
          <option value="webhook">webhook</option>
          <option value="manual">manual</option>
        </select>
        <input style={inp} placeholder="Trigger expr (e.g. 0 * * * *)" value={form.trigger_expr}
          onChange={e => setForm({ ...form, trigger_expr: e.target.value })} />
        <input style={inp} placeholder="Schedule label" value={form.schedule}
          onChange={e => setForm({ ...form, schedule: e.target.value })} />
        <label style={{ color: '#cbd5e1', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={form.enabled}
            onChange={e => setForm({ ...form, enabled: e.target.checked })} />
          Enabled
        </label>
        <textarea style={{ ...inp, gridColumn: '1 / span 3', minHeight: 48 }} placeholder="Notes"
          value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <div style={{ gridColumn: '1 / span 3', display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy}
            style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>{editId ? 'Update rule' : 'Add rule'}</button>
          {editId && (
            <button type="button" onClick={reset}
              style={{
                background: '#374151', color: '#fff', border: 'none', borderRadius: 6,
                padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>Cancel</button>
          )}
        </div>
      </form>

      <table style={{ width: '100%', color: '#cbd5e1', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #1f2937' }}>
            <th style={{ padding: 6 }}>#</th>
            <th style={{ padding: 6 }}>Name</th>
            <th style={{ padding: 6 }}>Bot</th>
            <th style={{ padding: 6 }}>Trigger</th>
            <th style={{ padding: 6 }}>Expression</th>
            <th style={{ padding: 6 }}>Schedule</th>
            <th style={{ padding: 6 }}>On</th>
            <th style={{ padding: 6 }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 && (
            <tr><td colSpan={8} style={{ color: '#64748b', padding: 12 }}>No rules yet. Add one above.</td></tr>
          )}
          {rules.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #1f2937' }}>
              <td style={{ padding: 6 }}>{r.id}</td>
              <td style={{ padding: 6 }}>{r.rule_name}</td>
              <td style={{ padding: 6 }}>{r.bot_id ?? '—'}</td>
              <td style={{ padding: 6 }}>{r.trigger_type}</td>
              <td style={{ padding: 6, fontFamily: 'monospace' }}>{r.trigger_expr}</td>
              <td style={{ padding: 6 }}>{r.schedule || '—'}</td>
              <td style={{ padding: 6 }}>{r.enabled ? 'yes' : 'no'}</td>
              <td style={{ padding: 6 }}>
                <button onClick={() => handleEdit(r)}
                  style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, marginRight: 4 }}>edit</button>
                <button onClick={() => handleDelete(r.id)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BotScheduleRulesEditor;
