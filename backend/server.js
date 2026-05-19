const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Validate required env vars on startup
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY is not set. AI features will fail.');
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.BACKEND_PORT || 4000;

// WebSocket server for live robot status
const { addClient } = require('./websocket');
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => addClient(ws));

// Security & middleware
let helmet;
try { helmet = require('helmet'); } catch (_) { helmet = null; }
if (helmet) app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/robots', require('./routes/robots'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/collisions', require('./routes/collisions'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/operators', require('./routes/operators'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/ai', require('./routes/ai'));

// Custom Views (4 RPA-choreography features) — mounted BEFORE 404 handler
app.use('/api/custom-views', require('./routes/customViews'));

// Auto-migrate: add result_json column and simulation_predictions table if missing
const pool = require('./db');
pool.query(`ALTER TABLE ai_results ADD COLUMN IF NOT EXISTS result_json JSONB`).catch(() => {});
pool.query(`
  CREATE TABLE IF NOT EXISTS simulation_predictions (
    id SERIAL PRIMARY KEY,
    scenario TEXT,
    duration VARCHAR(50),
    robot_count INTEGER,
    predicted_result TEXT,
    actual_result TEXT,
    comparison_notes TEXT,
    period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`Robot Choreographer API running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

// AI feature mount: fleet-sizing
app.use('/api/ai/fleet-sizing', require('./routes/ai-fleet-sizing'));
// === Batch 07 Gaps & Frontend Mounts ===
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
// === End Batch 07 ===
