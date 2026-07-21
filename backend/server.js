const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { validateRuntime } = require('./governance/runtime');
const { createProviderGate } = require('./governance/providerGate');
const auth = require('./middleware/auth');

validateRuntime();

const app = express();
const server = http.createServer(app);
const PORT = process.env.BACKEND_PORT || 4000;
const origins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map((value) => value.trim()).filter(Boolean);

let helmet;
try { helmet = require('helmet'); } catch (_) { helmet = null; }
if (helmet) app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (_req, res) => res.json({ status:'ok', timestamp:new Date().toISOString() }));

app.use(createProviderGate(['/api/ai','/api/gap']));
app.use('/api/governed-robotic-runs', require('./governance/router'));
app.use('/api', auth);

app.use('/api/robots', require('./routes/robots'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/collisions', require('./routes/collisions'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/operators', require('./routes/operators'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/custom-views', require('./routes/customViews'));

if (process.env.ENABLE_LEGACY_SCHEMA_BOOTSTRAP === 'true') {
  const pool = require('./db');
  Promise.all([
    pool.query('ALTER TABLE ai_results ADD COLUMN IF NOT EXISTS result_json JSONB'),
    pool.query(`CREATE TABLE IF NOT EXISTS simulation_predictions (
      id SERIAL PRIMARY KEY, scenario TEXT, duration VARCHAR(50), robot_count INTEGER,
      predicted_result TEXT, actual_result TEXT, comparison_notes TEXT,
      period_end TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
    )`),
  ]).catch((error) => console.error('Legacy schema bootstrap failed:', error.message));
}

if (process.env.ENABLE_LEGACY_PROVIDER_ROUTES === 'true') {
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api/ai/fleet-sizing', require('./routes/ai-fleet-sizing'));
  app.use('/api/gap-no-batteryoptimization-charge-scheduling', require('./routes/gap-no-batteryoptimization-charge-scheduling'));
  app.use('/api/gap-no-zoneheatmap-bottleneck-identification', require('./routes/gap-no-zoneheatmap-bottleneck-identification'));
  app.use('/api/gap-no-robothealthdashboard-aggregate-health-met', require('./routes/gap-no-robothealthdashboard-aggregate-health-met'));
  app.use('/api/gap-no-performancebenchmarking-ai', require('./routes/gap-no-performancebenchmarking-ai'));
  app.use('/api/gap-no-faultdiagnosis-rootcause-from-telemetry', require('./routes/gap-no-faultdiagnosis-rootcause-from-telemetry'));
  app.use('/api/gap-no-fleet-visualizationmapping-realtime-posit', require('./routes/gap-no-fleet-visualizationmapping-realtime-posit'));
  app.use('/api/gap-no-robot-devicedriverros-integration', require('./routes/gap-no-robot-devicedriverros-integration'));
  app.use('/api/gap-no-zonelayout-management-ui-route', require('./routes/gap-no-zonelayout-management-ui-route'));
  app.use('/api/gap-no-telemetry-ingestion-endpoint-sensor-strea', require('./routes/gap-no-telemetry-ingestion-endpoint-sensor-strea'));
  app.use('/api/gap-no-wmserp-integration-sap-manhattan', require('./routes/gap-no-wmserp-integration-sap-manhattan'));
  app.use('/api/gap-no-notifications-for-critical-faults', require('./routes/gap-no-notifications-for-critical-faults'));
  app.use('/api/gap-no-audit-log-for-safetyrelated-interventions', require('./routes/gap-no-audit-log-for-safetyrelated-interventions'));
}

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});
app.use((_req, res) => res.status(404).json({ error:'Route not found' }));

server.listen(PORT, () => {
  console.log(`Robot Choreographer API running on port ${PORT}; live device WebSocket control is disabled.`);
});
