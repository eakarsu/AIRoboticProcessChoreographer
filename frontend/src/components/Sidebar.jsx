import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { type: 'header', label: 'Dashboard' },
  { path: '/', label: 'Overview', icon: '📊' },

  { type: 'header', label: 'Fleet Management' },
  { path: '/robots', label: 'Robot Fleet', icon: '🤖' },
  { path: '/zones', label: 'Warehouse Zones', icon: '🏭' },
  { path: '/tasks', label: 'Task Queue', icon: '📋' },
  { path: '/collisions', label: 'Collision Incidents', icon: '💥' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/operators', label: 'Operators', icon: '👷' },
  { path: '/shifts', label: 'Shift Scheduling', icon: '📅' },

  { type: 'header', label: 'AI Features' },
  { path: '/ai/task-allocation', label: 'Task Allocation', icon: '🎯' },
  { path: '/ai/collision-avoidance', label: 'Collision Avoidance', icon: '🛡️' },
  { path: '/ai/path-planning', label: 'Path Planning', icon: '🗺️' },
  { path: '/ai/throughput-optimization', label: 'Throughput Optimizer', icon: '⚡' },
  { path: '/ai/predictive-maintenance', label: 'Predictive Maint.', icon: '🔮' },
  { path: '/ai/demand-forecast', label: 'Demand Forecast', icon: '📈' },
  { path: '/ai/simulation', label: 'Simulation', icon: '🎮' },
  { path: '/ai/history', label: 'AI History', icon: '📜' },
];

function Sidebar({ user, onLogout }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>🤖</div>
        <div>
          <div style={styles.logoTitle}>RoboChoreographer</div>
          <div style={styles.logoSub}>AI Warehouse Control</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item, i) => {
          if (item.type === 'header') {
            return <div key={i} style={styles.sectionHeader}>{item.label}</div>;
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>{user?.name?.[0] || 'A'}</div>
          <div>
            <div style={styles.userName}>{user?.name || 'Admin'}</div>
            <div style={styles.userRole}>{user?.role || 'admin'}</div>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    background: '#111827',
    borderRight: '1px solid #1f2937',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: '1px solid #1f2937',
  },
  logoIcon: { fontSize: '32px' },
  logoTitle: { fontSize: '16px', fontWeight: 700, color: '#f1f5f9' },
  logoSub: { fontSize: '11px', color: '#64748b', fontWeight: 500 },
  nav: {
    flex: 1,
    padding: '12px',
    overflowY: 'auto',
  },
  sectionHeader: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: '#4b5563',
    padding: '16px 12px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: '8px',
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s',
    marginBottom: '2px',
  },
  navItemActive: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
  },
  navIcon: { fontSize: '16px' },
  userSection: {
    padding: '16px',
    borderTop: '1px solid #1f2937',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#6366f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  userName: { fontSize: '13px', fontWeight: 600, color: '#e5e7eb' },
  userRole: { fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default Sidebar;
