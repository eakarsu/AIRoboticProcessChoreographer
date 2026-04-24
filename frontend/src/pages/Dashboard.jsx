import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const featureCards = [
  { path: '/robots', title: 'Robot Fleet', icon: '🤖', desc: 'Manage and monitor your warehouse robot fleet', color: '#6366f1', type: 'management' },
  { path: '/zones', title: 'Warehouse Zones', icon: '🏭', desc: 'Configure warehouse zones and layouts', color: '#0ea5e9', type: 'management' },
  { path: '/tasks', title: 'Task Queue', icon: '📋', desc: 'View and manage task assignments', color: '#8b5cf6', type: 'management' },
  { path: '/collisions', title: 'Collision Incidents', icon: '💥', desc: 'Track and resolve collision events', color: '#ef4444', type: 'management' },
  { path: '/maintenance', title: 'Maintenance', icon: '🔧', desc: 'Schedule and track robot maintenance', color: '#f59e0b', type: 'management' },
  { path: '/operators', title: 'Operators', icon: '👷', desc: 'Manage warehouse operators and staff', color: '#10b981', type: 'management' },
  { path: '/shifts', title: 'Shift Scheduling', icon: '📅', desc: 'Plan and manage work shifts', color: '#06b6d4', type: 'management' },
  { path: '/ai/task-allocation', title: 'AI Task Allocation', icon: '🎯', desc: 'AI-powered optimal task-to-robot assignment', color: '#6366f1', type: 'ai' },
  { path: '/ai/collision-avoidance', title: 'AI Collision Avoidance', icon: '🛡️', desc: 'AI analysis of collision risks and prevention', color: '#ef4444', type: 'ai' },
  { path: '/ai/path-planning', title: 'AI Path Planning', icon: '🗺️', desc: 'AI-optimized navigation routes for robots', color: '#0ea5e9', type: 'ai' },
  { path: '/ai/throughput-optimization', title: 'AI Throughput Optimizer', icon: '⚡', desc: 'Maximize warehouse throughput with AI', color: '#f59e0b', type: 'ai' },
  { path: '/ai/predictive-maintenance', title: 'AI Predictive Maintenance', icon: '🔮', desc: 'Predict maintenance needs before failures', color: '#8b5cf6', type: 'ai' },
  { path: '/ai/demand-forecast', title: 'AI Demand Forecast', icon: '📈', desc: 'AI-powered demand and workload forecasting', color: '#10b981', type: 'ai' },
  { path: '/ai/simulation', title: 'AI Simulation', icon: '🎮', desc: 'Simulate warehouse scenarios with AI', color: '#06b6d4', type: 'ai' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [robots, tasks, collisions, zones] = await Promise.all([
          api.get('/robots'), api.get('/tasks'), api.get('/collisions'), api.get('/zones'),
        ]);
        setStats({
          totalRobots: robots.data.length,
          activeRobots: robots.data.filter(r => r.status === 'active').length,
          pendingTasks: tasks.data.filter(t => ['pending', 'queued'].includes(t.status)).length,
          unresolvedCollisions: collisions.data.filter(c => !c.resolved).length,
          totalZones: zones.data.length,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Warehouse Command Center</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {[
          { label: 'Active Robots', value: stats.activeRobots || 0, total: stats.totalRobots || 0, color: '#10b981' },
          { label: 'Pending Tasks', value: stats.pendingTasks || 0, color: '#f59e0b' },
          { label: 'Open Incidents', value: stats.unresolvedCollisions || 0, color: '#ef4444' },
          { label: 'Total Zones', value: stats.totalZones || 0, color: '#0ea5e9' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: stat.color, marginTop: '4px' }}>
              {stat.value}{stat.total ? <span style={{ fontSize: '14px', color: '#64748b' }}>/{stat.total}</span> : ''}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#94a3b8' }}>Fleet Management</h2>
      <div className="grid-cards" style={{ marginBottom: '40px' }}>
        {featureCards.filter(c => c.type === 'management').map(card => (
          <div
            key={card.path}
            className="card"
            onClick={() => navigate(card.path)}
            style={{ cursor: 'pointer', borderLeft: `4px solid ${card.color}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>{card.icon}</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{card.title}</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>{card.desc}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#818cf8' }}>AI-Powered Features</h2>
      <div className="grid-cards">
        {featureCards.filter(c => c.type === 'ai').map(card => (
          <div
            key={card.path}
            className="card"
            onClick={() => navigate(card.path)}
            style={{ cursor: 'pointer', borderLeft: `4px solid ${card.color}`, background: 'linear-gradient(135deg, #1e293b, rgba(99, 102, 241, 0.05))' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>{card.icon}</span>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{card.title}</h3>
                <span className="badge badge-primary" style={{ marginTop: '4px' }}>AI Powered</span>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
