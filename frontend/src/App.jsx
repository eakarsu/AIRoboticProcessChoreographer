import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResourcePage from './pages/ResourcePage';
import AIFeaturePage from './pages/AIFeaturePage';
import AIHistoryPage from './pages/AIHistoryPage';
import Sidebar from './components/Sidebar';

function App() {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }

  if (location.pathname === '/login') {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={user} onLogout={handleLogout} />
      <main style={{ flex: 1, padding: '32px', marginLeft: '260px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/robots" element={<ResourcePage resource="robots" title="Robot Fleet" showToast={showToast} />} />
          <Route path="/zones" element={<ResourcePage resource="zones" title="Warehouse Zones" showToast={showToast} />} />
          <Route path="/tasks" element={<ResourcePage resource="tasks" title="Task Queue" showToast={showToast} />} />
          <Route path="/collisions" element={<ResourcePage resource="collisions" title="Collision Incidents" showToast={showToast} />} />
          <Route path="/maintenance" element={<ResourcePage resource="maintenance" title="Maintenance Schedules" showToast={showToast} />} />
          <Route path="/operators" element={<ResourcePage resource="operators" title="Operators" showToast={showToast} />} />
          <Route path="/shifts" element={<ResourcePage resource="shifts" title="Shift Scheduling" showToast={showToast} />} />
          <Route path="/ai/task-allocation" element={<AIFeaturePage feature="task-allocation" title="AI Task Allocation" showToast={showToast} />} />
          <Route path="/ai/collision-avoidance" element={<AIFeaturePage feature="collision-avoidance" title="AI Collision Avoidance" showToast={showToast} />} />
          <Route path="/ai/path-planning" element={<AIFeaturePage feature="path-planning" title="AI Path Planning" showToast={showToast} />} />
          <Route path="/ai/throughput-optimization" element={<AIFeaturePage feature="throughput-optimization" title="AI Throughput Optimizer" showToast={showToast} />} />
          <Route path="/ai/predictive-maintenance" element={<AIFeaturePage feature="predictive-maintenance" title="AI Predictive Maintenance" showToast={showToast} />} />
          <Route path="/ai/demand-forecast" element={<AIFeaturePage feature="demand-forecast" title="AI Demand Forecast" showToast={showToast} />} />
          <Route path="/ai/simulation" element={<AIFeaturePage feature="simulation" title="AI Simulation" showToast={showToast} />} />
          <Route path="/ai/history" element={<AIHistoryPage />} />
        </Routes>
      </main>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
