import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResourcePage from './pages/ResourcePage';
import AIFeaturePage from './pages/AIFeaturePage';
import AIHistoryPage from './pages/AIHistoryPage';
import OEEDashboard from './pages/OEEDashboard';
import BatteryOptimizationPage from './pages/BatteryOptimizationPage';
import ZoneHeatMapPage from './pages/ZoneHeatMapPage';
import FaultDiagnosisPage from './pages/FaultDiagnosisPage';
import RobotHealthDashboardPage from './pages/RobotHealthDashboardPage';
import PerformanceBenchmarkingPage from './pages/PerformanceBenchmarkingPage';
import DynamicFleetSizingPage from './pages/DynamicFleetSizingPage';
import ZoneCapacityForecastPage from './pages/ZoneCapacityForecastPage';
import ChargingOrchestrationPage from './pages/ChargingOrchestrationPage';
import Sidebar from './components/Sidebar';

// === Batch 07 Gaps & Frontend Mounts ===
import CfDynamicFleetSizeOptimization from './pages/CfDynamicFleetSizeOptimization';
import CfPredictiveCollisionPrevention from './pages/CfPredictiveCollisionPrevention';
import CfZoneCapacityForecasting from './pages/CfZoneCapacityForecasting';
import CfRobotSpecializationLearning from './pages/CfRobotSpecializationLearning';
import CfAutonomousChargingOrchestration from './pages/CfAutonomousChargingOrchestration';
import CfFailureModeLearning from './pages/CfFailureModeLearning';
import GapNoBatteryoptimizationChargeScheduling from './pages/GapNoBatteryoptimizationChargeScheduling';
import GapNoZoneheatmapBottleneckIdentification from './pages/GapNoZoneheatmapBottleneckIdentification';
import GapNoRobothealthdashboardAggregateHealthMet from './pages/GapNoRobothealthdashboardAggregateHealthMet';
import GapNoPerformancebenchmarkingAi from './pages/GapNoPerformancebenchmarkingAi';
import GapNoFaultdiagnosisRootcauseFromTelemetry from './pages/GapNoFaultdiagnosisRootcauseFromTelemetry';
import GapNoFleetVisualizationmappingRealtimePosit from './pages/GapNoFleetVisualizationmappingRealtimePosit';
import GapNoRobotDevicedriverrosIntegration from './pages/GapNoRobotDevicedriverrosIntegration';
import GapNoZonelayoutManagementUiRoute from './pages/GapNoZonelayoutManagementUiRoute';
import GapNoTelemetryIngestionEndpointSensorStrea from './pages/GapNoTelemetryIngestionEndpointSensorStrea';
import GapNoWmserpIntegrationSapManhattan from './pages/GapNoWmserpIntegrationSapManhattan';
import GapNoNotificationsForCriticalFaults from './pages/GapNoNotificationsForCriticalFaults';
import GapNoAuditLogForSafetyrelatedInterventions from './pages/GapNoAuditLogForSafetyrelatedInterventions';
// === End Batch 07 ===


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
          <Route path="/ai/auto-dispatch" element={<AIFeaturePage feature="auto-dispatch" title="AI Auto-Dispatcher" showToast={showToast} />} />
          <Route path="/robots/oee" element={<OEEDashboard />} />
          <Route path="/ai/battery-optimization" element={<BatteryOptimizationPage showToast={showToast} />} />
          <Route path="/ai/zone-heat-map" element={<ZoneHeatMapPage showToast={showToast} />} />
          <Route path="/ai/fault-diagnosis" element={<FaultDiagnosisPage showToast={showToast} />} />
          <Route path="/ai/robot-health-dashboard" element={<RobotHealthDashboardPage showToast={showToast} />} />
          <Route path="/ai/performance-benchmarking" element={<PerformanceBenchmarkingPage showToast={showToast} />} />
          <Route path="/ai/dynamic-fleet-sizing" element={<DynamicFleetSizingPage showToast={showToast} />} />
          <Route path="/ai/zone-capacity-forecast" element={<ZoneCapacityForecastPage showToast={showToast} />} />
          <Route path="/ai/charging-orchestration" element={<ChargingOrchestrationPage showToast={showToast} />} />
          // === Batch 07 Gaps & Frontend Mounts ===
          <Route path='/cf-dynamic-fleet-size-optimization' element={<CfDynamicFleetSizeOptimization />} />
          <Route path='/cf-predictive-collision-prevention' element={<CfPredictiveCollisionPrevention />} />
          <Route path='/cf-zone-capacity-forecasting' element={<CfZoneCapacityForecasting />} />
          <Route path='/cf-robot-specialization-learning' element={<CfRobotSpecializationLearning />} />
          <Route path='/cf-autonomous-charging-orchestration' element={<CfAutonomousChargingOrchestration />} />
          <Route path='/cf-failure-mode-learning' element={<CfFailureModeLearning />} />
          <Route path='/gap-no-batteryoptimization-charge-scheduling' element={<GapNoBatteryoptimizationChargeScheduling />} />
          <Route path='/gap-no-zoneheatmap-bottleneck-identification' element={<GapNoZoneheatmapBottleneckIdentification />} />
          <Route path='/gap-no-robothealthdashboard-aggregate-health-met' element={<GapNoRobothealthdashboardAggregateHealthMet />} />
          <Route path='/gap-no-performancebenchmarking-ai' element={<GapNoPerformancebenchmarkingAi />} />
          <Route path='/gap-no-faultdiagnosis-rootcause-from-telemetry' element={<GapNoFaultdiagnosisRootcauseFromTelemetry />} />
          <Route path='/gap-no-fleet-visualizationmapping-realtime-posit' element={<GapNoFleetVisualizationmappingRealtimePosit />} />
          <Route path='/gap-no-robot-devicedriverros-integration' element={<GapNoRobotDevicedriverrosIntegration />} />
          <Route path='/gap-no-zonelayout-management-ui-route' element={<GapNoZonelayoutManagementUiRoute />} />
          <Route path='/gap-no-telemetry-ingestion-endpoint-sensor-strea' element={<GapNoTelemetryIngestionEndpointSensorStrea />} />
          <Route path='/gap-no-wmserp-integration-sap-manhattan' element={<GapNoWmserpIntegrationSapManhattan />} />
          <Route path='/gap-no-notifications-for-critical-faults' element={<GapNoNotificationsForCriticalFaults />} />
          <Route path='/gap-no-audit-log-for-safetyrelated-interventions' element={<GapNoAuditLogForSafetyrelatedInterventions />} />
          // === End Batch 07 ===
        </Routes>
      </main>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
