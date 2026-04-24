import React, { useState, useEffect } from 'react';
import api from '../api';

const resourceConfig = {
  robots: {
    columns: ['name', 'type', 'status', 'battery_level', 'current_zone', 'payload_capacity', 'speed'],
    labels: { name: 'Name', type: 'Type', status: 'Status', battery_level: 'Battery %', current_zone: 'Zone', payload_capacity: 'Capacity (kg)', speed: 'Speed (m/s)', last_maintenance: 'Last Maintenance' },
    fields: [
      { key: 'name', type: 'text', required: true },
      { key: 'type', type: 'select', options: ['AGV', 'AMR', 'Drone', 'Forklift Bot', 'Sorting Bot', 'Palletizer', 'Conveyor Bot'] },
      { key: 'status', type: 'select', options: ['active', 'idle', 'charging', 'maintenance', 'offline'] },
      { key: 'battery_level', type: 'number' },
      { key: 'current_zone', type: 'number' },
      { key: 'payload_capacity', type: 'number' },
      { key: 'speed', type: 'number' },
      { key: 'last_maintenance', type: 'date' },
    ],
  },
  zones: {
    columns: ['name', 'type', 'width', 'height', 'max_robots', 'current_robots', 'status'],
    labels: { name: 'Name', type: 'Type', width: 'Width (m)', height: 'Height (m)', max_robots: 'Max Robots', current_robots: 'Current', status: 'Status', description: 'Description' },
    fields: [
      { key: 'name', type: 'text', required: true },
      { key: 'type', type: 'select', options: ['Receiving', 'Storage', 'Picking', 'Packing', 'Sorting', 'Shipping', 'Charging', 'Maintenance', 'Inspection', 'Buffer'] },
      { key: 'width', type: 'number' }, { key: 'height', type: 'number' },
      { key: 'max_robots', type: 'number' }, { key: 'current_robots', type: 'number' },
      { key: 'status', type: 'select', options: ['active', 'maintenance', 'restricted', 'offline'] },
      { key: 'description', type: 'textarea' },
    ],
  },
  tasks: {
    columns: ['title', 'type', 'priority', 'status', 'assigned_robot_id', 'payload_weight'],
    labels: { title: 'Title', type: 'Type', priority: 'Priority', status: 'Status', assigned_robot_id: 'Robot ID', source_zone_id: 'Source Zone', dest_zone_id: 'Dest Zone', payload_weight: 'Weight (kg)', deadline: 'Deadline' },
    fields: [
      { key: 'title', type: 'text', required: true },
      { key: 'type', type: 'select', options: ['Pick', 'Pack', 'Transport', 'Sort', 'Recharge', 'Inspect'] },
      { key: 'priority', type: 'number' },
      { key: 'status', type: 'select', options: ['pending', 'queued', 'in_progress', 'completed', 'cancelled'] },
      { key: 'assigned_robot_id', type: 'number' },
      { key: 'source_zone_id', type: 'number' }, { key: 'dest_zone_id', type: 'number' },
      { key: 'payload_weight', type: 'number' },
      { key: 'deadline', type: 'datetime-local' },
    ],
  },
  collisions: {
    columns: ['robot1_id', 'robot2_id', 'zone_id', 'severity', 'resolved', 'occurred_at'],
    labels: { robot1_id: 'Robot 1', robot2_id: 'Robot 2', zone_id: 'Zone', severity: 'Severity', description: 'Description', resolved: 'Resolved', resolution_notes: 'Resolution', occurred_at: 'Occurred At' },
    fields: [
      { key: 'robot1_id', type: 'number', required: true }, { key: 'robot2_id', type: 'number', required: true },
      { key: 'zone_id', type: 'number' },
      { key: 'severity', type: 'select', options: ['minor', 'moderate', 'severe', 'critical'] },
      { key: 'description', type: 'textarea' },
      { key: 'resolved', type: 'select', options: ['true', 'false'] },
      { key: 'resolution_notes', type: 'textarea' },
      { key: 'occurred_at', type: 'datetime-local' },
    ],
  },
  maintenance: {
    columns: ['robot_id', 'type', 'status', 'scheduled_date', 'cost', 'technician'],
    labels: { robot_id: 'Robot ID', type: 'Type', status: 'Status', scheduled_date: 'Scheduled', completed_date: 'Completed', notes: 'Notes', cost: 'Cost ($)', technician: 'Technician' },
    fields: [
      { key: 'robot_id', type: 'number', required: true },
      { key: 'type', type: 'select', options: ['Battery Replacement', 'Wheel Alignment', 'Sensor Calibration', 'Motor Overhaul', 'Software Update', 'Full Overhaul', 'Hydraulic Service', 'Emergency Diagnostic'] },
      { key: 'status', type: 'select', options: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
      { key: 'scheduled_date', type: 'date' }, { key: 'completed_date', type: 'date' },
      { key: 'notes', type: 'textarea' }, { key: 'cost', type: 'number' },
      { key: 'technician', type: 'text' },
    ],
  },
  operators: {
    columns: ['name', 'email', 'role', 'shift', 'certification_level', 'active'],
    labels: { name: 'Name', email: 'Email', role: 'Role', shift: 'Shift', certification_level: 'Cert Level', active: 'Active', phone: 'Phone', hire_date: 'Hire Date' },
    fields: [
      { key: 'name', type: 'text', required: true }, { key: 'email', type: 'email', required: true },
      { key: 'role', type: 'select', options: ['Floor Supervisor', 'Robot Technician', 'Warehouse Operator', 'Safety Officer', 'Systems Engineer', 'Data Analyst'] },
      { key: 'shift', type: 'select', options: ['morning', 'afternoon', 'night'] },
      { key: 'certification_level', type: 'select', options: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'] },
      { key: 'active', type: 'select', options: ['true', 'false'] },
      { key: 'phone', type: 'text' }, { key: 'hire_date', type: 'date' },
    ],
  },
  shifts: {
    columns: ['name', 'start_time', 'end_time', 'operator_id', 'zone_id', 'robot_count', 'status'],
    labels: { name: 'Name', start_time: 'Start', end_time: 'End', operator_id: 'Operator ID', zone_id: 'Zone ID', robot_count: 'Robots', status: 'Status', notes: 'Notes' },
    fields: [
      { key: 'name', type: 'text', required: true },
      { key: 'start_time', type: 'time' }, { key: 'end_time', type: 'time' },
      { key: 'operator_id', type: 'number' }, { key: 'zone_id', type: 'number' },
      { key: 'robot_count', type: 'number' },
      { key: 'status', type: 'select', options: ['active', 'scheduled', 'completed', 'standby', 'cancelled'] },
      { key: 'notes', type: 'textarea' },
    ],
  },
};

function getStatusBadge(value) {
  const v = String(value).toLowerCase();
  if (['active', 'completed', 'true'].includes(v)) return 'badge-success';
  if (['pending', 'scheduled', 'queued', 'idle', 'standby'].includes(v)) return 'badge-warning';
  if (['offline', 'severe', 'critical', 'cancelled', 'false'].includes(v)) return 'badge-danger';
  if (['in_progress', 'charging', 'moderate'].includes(v)) return 'badge-info';
  if (['maintenance', 'minor'].includes(v)) return 'badge-primary';
  return 'badge-muted';
}

function formatValue(key, value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'resolved') return value ? 'Yes' : 'No';
  if (key === 'active') return value ? 'Active' : 'Inactive';
  if (['status', 'severity', 'type', 'shift', 'certification_level'].includes(key)) {
    return <span className={`badge ${getStatusBadge(value)}`}>{String(value).replace(/_/g, ' ')}</span>;
  }
  if (key === 'battery_level') {
    const pct = Number(value);
    const color = pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '60px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
        </div>
        <span style={{ color, fontWeight: 600, fontSize: '13px' }}>{pct}%</span>
      </div>
    );
  }
  if (key === 'cost') return `$${Number(value).toLocaleString()}`;
  if (key.includes('date') || key.includes('_at')) {
    return value ? new Date(value).toLocaleDateString() : '-';
  }
  return String(value);
}

function ResourcePage({ resource, title, showToast }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  const config = resourceConfig[resource];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/${resource}`);
      setItems(res.data);
    } catch (err) {
      console.error('Error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); setSelected(null); }, [resource]);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    const data = {};
    config.fields.forEach(f => {
      let val = item[f.key];
      if (f.type === 'date' && val) val = val.substring(0, 10);
      if (f.type === 'datetime-local' && val) val = val.substring(0, 16);
      if (f.key === 'resolved' || f.key === 'active') val = String(val);
      data[f.key] = val ?? '';
    });
    setFormData(data);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/${resource}/${id}`);
      showToast('Item deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.resolved) payload.resolved = payload.resolved === 'true';
    if (payload.active) payload.active = payload.active === 'true';
    try {
      if (editItem) {
        await api.put(`/${resource}/${editItem.id}`, payload);
        showToast('Item updated successfully');
      } else {
        await api.post(`/${resource}`, payload);
        showToast('Item created successfully');
      }
      setShowModal(false);
      fetchItems();
      setSelected(null);
    } catch (err) {
      showToast('Operation failed', 'error');
    }
  };

  const handleRowClick = (item) => {
    setSelected(selected?.id === item.id ? null : item);
  };

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <button className="btn btn-primary" onClick={handleCreate}>+ New {title.replace(/s$/, '').replace('Scheduling', 'Shift')}</button>
      </div>

      {selected && (
        <div className="detail-panel">
          <h2>Details - {selected.name || selected.title || `#${selected.id}`}</h2>
          <div className="detail-grid">
            {Object.entries(selected).filter(([k]) => k !== 'created_at').map(([key, value]) => (
              <div key={key} className="detail-item">
                <label>{config.labels[key] || key.replace(/_/g, ' ')}</label>
                <span>{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading-spinner" style={{ padding: '40px' }}>Loading {title.toLowerCase()}...</div>
        ) : items.length === 0 ? (
          <div className="empty-state"><p>No {title.toLowerCase()} found</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {config.columns.map(col => <th key={col}>{config.labels[col] || col}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  style={selected?.id === item.id ? { background: 'rgba(99, 102, 241, 0.1)' } : {}}
                >
                  <td style={{ fontWeight: 600, color: '#94a3b8' }}>{item.id}</td>
                  {config.columns.map(col => <td key={col}>{formatValue(col, item[col])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editItem ? 'Edit' : 'New'} {title.replace(/s$/, '').replace('Scheduling', 'Shift')}</h2>
            <form onSubmit={handleSubmit}>
              {config.fields.map(field => (
                <div key={field.key} className="form-group">
                  <label>{config.labels[field.key] || field.key.replace(/_/g, ' ')}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={formData[field.key] || ''}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      required={field.required}
                      step={field.type === 'number' ? 'any' : undefined}
                    />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcePage;
