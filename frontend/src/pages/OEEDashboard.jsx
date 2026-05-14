import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function OEEGauge({ value, label }) {
  const color = value >= 85 ? '#22c55e' : value >= 60 ? '#eab308' : value >= 40 ? '#f97316' : '#ef4444';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: `conic-gradient(${color} ${value * 3.6}deg, #1f2937 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
      }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color }}>{value}%</span>
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{label}</div>
    </div>
  );
}

function OEEDashboard() {
  const [robots, setRobots] = useState([]);
  const [oeeData, setOeeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [liveStatuses, setLiveStatuses] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    loadRobots();
    connectWebSocket();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const connectWebSocket = () => {
    try {
      const wsUrl = `ws://${window.location.hostname}:${import.meta.env.VITE_BACKEND_PORT || 4000}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'robot_update' && msg.robot) {
            setLiveStatuses(prev => ({ ...prev, [msg.robot.id]: msg.robot }));
          }
        } catch (_) {}
      };
      ws.onerror = () => {}; // Silently fail if WS not available
    } catch (_) {}
  };

  const loadRobots = async () => {
    try {
      const res = await api.get('/robots');
      const list = res.data || [];
      setRobots(list);
      // Load OEE for each robot
      const oeeMap = {};
      await Promise.all(list.map(async (robot) => {
        try {
          const oeeRes = await api.get(`/robots/${robot.id}/oee`);
          oeeMap[robot.id] = oeeRes.data;
        } catch (_) {
          oeeMap[robot.id] = null;
        }
      }));
      setOeeData(oeeMap);
    } catch (e) {
      console.error('Failed to load robots:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { active: '#22c55e', idle: '#eab308', charging: '#3b82f6', maintenance: '#f97316', offline: '#6b7280' };
    return colors[status] || '#9ca3af';
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div className="loading-spinner">Loading OEE data...</div>
    </div>
  );

  const avgOEE = Object.values(oeeData).filter(Boolean).reduce((sum, d) => sum + (d.oee_percent || 0), 0) / Math.max(Object.values(oeeData).filter(Boolean).length, 1);

  return (
    <div>
      <div className="page-header">
        <h1>OEE Dashboard</h1>
        <p>Overall Equipment Effectiveness per robot — live status badges update via WebSocket</p>
      </div>

      {/* Summary Card */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b, rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#6366f1' }}>{Math.round(avgOEE)}%</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Fleet Average OEE</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#22c55e' }}>{robots.filter(r => r.status === 'active').length}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Active Robots</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#eab308' }}>{robots.filter(r => r.status === 'idle').length}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Idle Robots</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#f97316' }}>{robots.filter(r => r.status === 'maintenance').length}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>In Maintenance</div>
          </div>
        </div>
      </div>

      {/* Robot OEE Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {robots.map(robot => {
          const live = liveStatuses[robot.id] || robot;
          const oee = oeeData[robot.id];
          return (
            <div key={robot.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9' }}>{robot.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{robot.type}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {/* Live status badge — updates via WebSocket */}
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(live.status), display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', color: getStatusColor(live.status), fontWeight: 600, textTransform: 'capitalize' }}>{live.status}</span>
                  {liveStatuses[robot.id] && (
                    <span style={{ fontSize: '10px', background: '#22c55e20', color: '#22c55e', padding: '1px 6px', borderRadius: '10px', marginLeft: '4px' }}>LIVE</span>
                  )}
                </div>
              </div>

              {oee ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
                    <OEEGauge value={oee.oee_percent} label="OEE" />
                    <OEEGauge value={oee.components?.availability || 0} label="Availability" />
                    <OEEGauge value={oee.components?.performance || 0} label="Performance" />
                    <OEEGauge value={oee.components?.quality || 0} label="Quality" />
                  </div>

                  <div style={{ background: '#0f172a', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      <span style={{ color: '#64748b' }}>Tasks Completed</span>
                      <span style={{ color: '#e2e8f0' }}>{oee.metrics?.completed_tasks}/{oee.metrics?.total_tasks}</span>
                      <span style={{ color: '#64748b' }}>Battery</span>
                      <span style={{ color: '#e2e8f0' }}>{live.battery_level}%</span>
                      <span style={{ color: '#64748b' }}>Collision Incidents</span>
                      <span style={{ color: oee.metrics?.collision_incidents > 0 ? '#ef4444' : '#e2e8f0' }}>{oee.metrics?.collision_incidents}</span>
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: oee.oee_percent >= 85 ? '#22c55e' : oee.oee_percent >= 60 ? '#eab308' : '#ef4444' }}>
                      {oee.interpretation}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px', fontSize: '13px' }}>OEE data unavailable</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OEEDashboard;
