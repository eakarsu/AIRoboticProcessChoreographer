const express = require('express');
const router = express.Router();
const pool = require('../db');
const fetch = require('node-fetch');
const authMiddleware = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// 3-strategy JSON parser
function parseAIJson(content) {
  // Strategy 1: direct parse
  try { return JSON.parse(content); } catch (_) {}
  // Strategy 2: markdown code block
  try {
    const block = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (block) return JSON.parse(block[1].trim());
  } catch (_) {}
  // Strategy 3: first {...} or [...] block
  try {
    const obj = content.match(/[\[{][\s\S]*[\]}]/);
    if (obj) return JSON.parse(obj[0]);
  } catch (_) {}
  return null;
}

async function callOpenRouter(prompt, feature, extraInput = '') {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('OPENROUTER_API_KEY not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert warehouse robotics AI consultant. Provide detailed, actionable analysis. Format your response with clear sections using markdown headers (##), bullet points, and bold text for key metrics. Be specific with numbers and recommendations.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter error');
  const result = data.choices?.[0]?.message?.content || 'No response from AI';
  const resultJson = parseAIJson(result);

  // Persist AI result with result_json column
  try {
    await pool.query(
      'INSERT INTO ai_results (feature, input_summary, result, result_json, model_used, tokens_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [feature, (extraInput || prompt).substring(0, 200), result, resultJson ? JSON.stringify(resultJson) : null, OPENROUTER_MODEL, data.usage?.total_tokens || 0]
    );
  } catch (_) {
    // If result_json column doesn't exist yet, fall back
    try {
      await pool.query(
        'INSERT INTO ai_results (feature, input_summary, result, model_used, tokens_used) VALUES ($1, $2, $3, $4, $5)',
        [feature, (extraInput || prompt).substring(0, 200), result, OPENROUTER_MODEL, data.usage?.total_tokens || 0]
      );
    } catch (__) {}
  }

  return { result, result_json: resultJson, usage: data.usage };
}

// Apply auth + AI rate limiter to all AI routes
router.use(authMiddleware);
router.use(aiRateLimiter);

// POST /api/ai/task-allocation
router.post('/task-allocation', async (req, res) => {
  try {
    const robots = await pool.query("SELECT * FROM robots WHERE status != 'offline' ORDER BY id");
    const tasks = await pool.query("SELECT * FROM tasks WHERE status IN ('pending', 'queued') ORDER BY priority DESC, deadline ASC");
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');

    const prompt = `Analyze and optimize task allocation for our warehouse robot fleet.

AVAILABLE ROBOTS:
${robots.rows.map(r => `- ${r.name} (${r.type}): Battery ${r.battery_level}%, Zone: ${r.current_zone}, Capacity: ${r.payload_capacity}kg, Speed: ${r.speed}m/s, Status: ${r.status}`).join('\n')}

PENDING TASKS:
${tasks.rows.map(t => `- ${t.title} (${t.type}): Priority ${t.priority}, Weight: ${t.payload_weight}kg, From Zone ${t.source_zone_id} to Zone ${t.dest_zone_id}, Deadline: ${t.deadline}`).join('\n')}

ZONES:
${zones.rows.map(z => `- Zone ${z.id}: ${z.name} (${z.type}), Capacity: ${z.max_robots} robots, Current: ${z.current_robots}`).join('\n')}

Provide optimal task-to-robot assignments considering battery levels, payload capacity, proximity, and deadlines. Include efficiency score and reasoning for each assignment.`;

    const aiResult = await callOpenRouter(prompt, 'task-allocation');
    res.json(aiResult);
  } catch (err) {
    console.error('AI task allocation error:', err);
    res.status(500).json({ error: 'AI task allocation failed' });
  }
});

// POST /api/ai/auto-dispatch
// Calls task-allocation AI and writes assignments back to tasks table
router.post('/auto-dispatch', async (req, res) => {
  try {
    const robots = await pool.query("SELECT * FROM robots WHERE status NOT IN ('offline', 'maintenance') ORDER BY battery_level DESC");
    const tasks = await pool.query("SELECT * FROM tasks WHERE status = 'pending' ORDER BY priority DESC, deadline ASC LIMIT 20");
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');

    if (tasks.rows.length === 0) {
      return res.json({ message: 'No pending tasks to dispatch', dispatched: 0 });
    }

    const prompt = `You are a warehouse task dispatcher. Assign pending tasks to available robots optimally.

AVAILABLE ROBOTS (sorted by battery, highest first):
${robots.rows.map(r => `- ID:${r.id} ${r.name} (${r.type}): Battery ${r.battery_level}%, Zone ${r.current_zone}, Max payload ${r.payload_capacity}kg`).join('\n')}

PENDING TASKS (sorted by priority):
${tasks.rows.map(t => `- ID:${t.id} "${t.title}" (${t.type}): Priority ${t.priority}, Weight ${t.payload_weight}kg, Zone ${t.source_zone_id}->${t.dest_zone_id}, Deadline: ${t.deadline}`).join('\n')}

Return ONLY a JSON array of assignments. Each entry must be:
{"task_id": <number>, "robot_id": <number>, "reason": "brief reason"}

If a task cannot be assigned, omit it. JSON only, no other text.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a warehouse dispatch AI. Always respond with only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const content = data.choices?.[0]?.message?.content || '[]';
    const assignments = parseAIJson(content) || [];

    // Write assignments back to tasks table
    const dispatched = [];
    for (const assignment of assignments) {
      if (!assignment.task_id || !assignment.robot_id) continue;
      try {
        const robotExists = robots.rows.find(r => r.id === assignment.robot_id);
        const taskExists = tasks.rows.find(t => t.id === assignment.task_id);
        if (!robotExists || !taskExists) continue;

        await pool.query(
          `UPDATE tasks SET assigned_robot_id = $1, status = 'queued', updated_at = NOW() WHERE id = $2 AND status = 'pending'`,
          [assignment.robot_id, assignment.task_id]
        );
        dispatched.push(assignment);
      } catch (e) {
        console.error('Failed to assign task', assignment.task_id, ':', e.message);
      }
    }

    // Persist AI result
    try {
      await pool.query(
        'INSERT INTO ai_results (feature, input_summary, result, result_json, model_used, tokens_used) VALUES ($1, $2, $3, $4, $5, $6)',
        ['auto-dispatch', `tasks:${tasks.rows.length} robots:${robots.rows.length}`, content, JSON.stringify(dispatched), OPENROUTER_MODEL, data.usage?.total_tokens || 0]
      );
    } catch (_) {}

    res.json({
      message: `Auto-dispatched ${dispatched.length} tasks`,
      dispatched,
      total_pending: tasks.rows.length,
      total_robots: robots.rows.length
    });
  } catch (err) {
    console.error('AI auto-dispatch error:', err);
    res.status(500).json({ error: 'AI auto-dispatch failed' });
  }
});

// POST /api/ai/collision-avoidance
router.post('/collision-avoidance', async (req, res) => {
  try {
    const robots = await pool.query("SELECT * FROM robots WHERE status = 'active' ORDER BY id");
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');
    const recentCollisions = await pool.query('SELECT * FROM collisions ORDER BY occurred_at DESC LIMIT 10');

    const prompt = `Analyze collision risks and suggest avoidance strategies for our warehouse.

ACTIVE ROBOTS AND POSITIONS:
${robots.rows.map(r => `- ${r.name} (${r.type}): Zone ${r.current_zone}, Speed: ${r.speed}m/s, Status: ${r.status}`).join('\n')}

ZONE LAYOUT:
${zones.rows.map(z => `- Zone ${z.id}: ${z.name} (${z.type}), Size: ${z.width}x${z.height}m, Max robots: ${z.max_robots}, Current: ${z.current_robots}`).join('\n')}

RECENT COLLISION HISTORY:
${recentCollisions.rows.map(c => `- Severity: ${c.severity}, Zone ${c.zone_id}, Robots: ${c.robot1_id} & ${c.robot2_id}, Resolved: ${c.resolved}`).join('\n')}

Identify high-risk collision zones, suggest path adjustments, recommend speed limits per zone, and provide a priority-ranked list of interventions.`;

    const aiResult = await callOpenRouter(prompt, 'collision-avoidance');
    res.json(aiResult);
  } catch (err) {
    console.error('AI collision avoidance error:', err);
    res.status(500).json({ error: 'AI collision avoidance failed' });
  }
});

// POST /api/ai/path-planning
router.post('/path-planning', async (req, res) => {
  try {
    const { robotId, sourceZoneId, destZoneId } = req.body;
    const robot = await pool.query('SELECT * FROM robots WHERE id = $1', [robotId || 1]);
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');
    const activeRobots = await pool.query("SELECT * FROM robots WHERE status = 'active' AND id != $1", [robotId || 1]);

    const prompt = `Plan an optimal path for robot navigation in our warehouse.

ROBOT: ${robot.rows[0]?.name || 'Robot-1'} (${robot.rows[0]?.type || 'AGV'})
- Current Zone: ${robot.rows[0]?.current_zone || sourceZoneId || 1}
- Destination Zone: ${destZoneId || 5}
- Speed: ${robot.rows[0]?.speed || 2}m/s
- Battery: ${robot.rows[0]?.battery_level || 80}%

WAREHOUSE ZONES:
${zones.rows.map(z => `- Zone ${z.id}: ${z.name} (${z.type}), Size: ${z.width}x${z.height}m, Current robots: ${z.current_robots}/${z.max_robots}`).join('\n')}

OTHER ACTIVE ROBOTS:
${activeRobots.rows.map(r => `- ${r.name} in Zone ${r.current_zone}, heading: ${r.status}`).join('\n')}

Calculate the optimal path considering zone congestion, distance, and active robot positions. Provide turn-by-turn zone transitions, estimated time, energy consumption, and alternative routes.`;

    const aiResult = await callOpenRouter(prompt, 'path-planning');
    res.json(aiResult);
  } catch (err) {
    console.error('AI path planning error:', err);
    res.status(500).json({ error: 'AI path planning failed' });
  }
});

// POST /api/ai/throughput-optimization
router.post('/throughput-optimization', async (req, res) => {
  try {
    const robots = await pool.query('SELECT * FROM robots ORDER BY id');
    const tasks = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 20');
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY id');

    const prompt = `Analyze warehouse throughput and suggest optimizations.

ROBOT FLEET (${robots.rows.length} robots):
${robots.rows.map(r => `- ${r.name} (${r.type}): Battery ${r.battery_level}%, Status: ${r.status}, Speed: ${r.speed}m/s`).join('\n')}

RECENT TASKS (${tasks.rows.length}):
${tasks.rows.map(t => `- ${t.title}: ${t.status}, Priority: ${t.priority}, Type: ${t.type}`).join('\n')}

ZONES:
${zones.rows.map(z => `- ${z.name}: ${z.current_robots}/${z.max_robots} robots, Type: ${z.type}`).join('\n')}

SHIFTS:
${shifts.rows.map(s => `- ${s.name}: ${s.start_time}-${s.end_time}, Status: ${s.status}, Robots: ${s.robot_count}`).join('\n')}

Analyze current throughput bottlenecks, calculate efficiency metrics, and provide specific recommendations to maximize warehouse throughput. Include estimated improvement percentages.`;

    const aiResult = await callOpenRouter(prompt, 'throughput-optimization');
    res.json(aiResult);
  } catch (err) {
    console.error('AI throughput optimization error:', err);
    res.status(500).json({ error: 'AI throughput optimization failed' });
  }
});

// POST /api/ai/predictive-maintenance
router.post('/predictive-maintenance', async (req, res) => {
  try {
    const robots = await pool.query('SELECT * FROM robots ORDER BY id');
    const maintenance = await pool.query('SELECT * FROM maintenance ORDER BY scheduled_date DESC');

    const prompt = `Predict maintenance needs for our robot fleet.

ROBOT FLEET:
${robots.rows.map(r => `- ${r.name} (${r.type}): Battery ${r.battery_level}%, Speed: ${r.speed}m/s, Last Maintenance: ${r.last_maintenance}, Status: ${r.status}`).join('\n')}

MAINTENANCE HISTORY:
${maintenance.rows.map(m => `- Robot ${m.robot_id}: ${m.type} maintenance, Status: ${m.status}, Scheduled: ${m.scheduled_date}, Cost: $${m.cost}, Notes: ${m.notes}`).join('\n')}

Predict which robots need maintenance soon based on battery degradation patterns, usage history, and maintenance intervals. Provide risk scores (1-10), predicted failure dates, recommended maintenance types, and estimated costs. Prioritize by urgency.`;

    const aiResult = await callOpenRouter(prompt, 'predictive-maintenance');
    res.json(aiResult);
  } catch (err) {
    console.error('AI predictive maintenance error:', err);
    res.status(500).json({ error: 'AI predictive maintenance failed' });
  }
});

// POST /api/ai/demand-forecast
router.post('/demand-forecast', async (req, res) => {
  try {
    const tasks = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');
    const shifts = await pool.query('SELECT * FROM shifts ORDER BY id');

    const prompt = `Forecast warehouse demand and workload patterns.

TASK HISTORY (${tasks.rows.length} tasks):
${tasks.rows.map(t => `- ${t.title} (${t.type}): Priority ${t.priority}, Status: ${t.status}, Weight: ${t.payload_weight}kg, Created: ${t.created_at}`).join('\n')}

ZONE UTILIZATION:
${zones.rows.map(z => `- ${z.name} (${z.type}): ${z.current_robots}/${z.max_robots} capacity used`).join('\n')}

SHIFT PATTERNS:
${shifts.rows.map(s => `- ${s.name}: ${s.start_time}-${s.end_time}, Robots: ${s.robot_count}, Status: ${s.status}`).join('\n')}

Forecast upcoming demand patterns for the next 7 days. Include peak hours, expected task volumes by type, zone utilization predictions, recommended staffing levels, and suggested robot deployment strategies. Provide confidence intervals for predictions.`;

    const aiResult = await callOpenRouter(prompt, 'demand-forecast');
    res.json(aiResult);
  } catch (err) {
    console.error('AI demand forecast error:', err);
    res.status(500).json({ error: 'AI demand forecast failed' });
  }
});

// POST /api/ai/simulation
router.post('/simulation', async (req, res) => {
  try {
    const { scenario, duration, robotCount } = req.body;
    const robots = await pool.query('SELECT * FROM robots ORDER BY id');
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');

    // Store simulation prediction for later comparison
    const simParams = { scenario: scenario || 'Peak holiday season with 3x normal order volume', duration: duration || '8 hours', robotCount: robotCount || robots.rows.length };

    const prompt = `Run a warehouse simulation with the following parameters:

SCENARIO: ${simParams.scenario}
DURATION: ${simParams.duration}
ROBOT COUNT: ${simParams.robotCount}

CURRENT FLEET:
${robots.rows.map(r => `- ${r.name} (${r.type}): Capacity ${r.payload_capacity}kg, Speed ${r.speed}m/s`).join('\n')}

WAREHOUSE LAYOUT:
${zones.rows.map(z => `- ${z.name} (${z.type}): ${z.width}x${z.height}m, Max robots: ${z.max_robots}`).join('\n')}

Simulate this scenario and provide:
1. Expected throughput (tasks/hour)
2. Average task completion time
3. Collision risk assessment
4. Battery depletion timeline
5. Bottleneck zones
6. Robot utilization rates
7. Recommendations for improvement
8. Comparison with current performance

Use realistic metrics and provide hour-by-hour breakdown.`;

    const aiResult = await callOpenRouter(prompt, 'simulation', JSON.stringify(simParams));

    // Save simulation prediction for Digital Twin Comparator
    try {
      await pool.query(`
        INSERT INTO simulation_predictions (scenario, duration, robot_count, predicted_result, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [simParams.scenario, simParams.duration, simParams.robotCount, aiResult.result]);
    } catch (_) {
      // Table may not exist yet; non-fatal
    }

    res.json(aiResult);
  } catch (err) {
    console.error('AI simulation error:', err);
    res.status(500).json({ error: 'AI simulation failed' });
  }
});

// POST /api/ai/battery-optimization (charge scheduling)
router.post('/battery-optimization', async (req, res) => {
  try {
    const robots = await pool.query("SELECT id, name, battery_level, status, last_charged_at FROM robots ORDER BY battery_level ASC NULLS LAST LIMIT 50");
    const stations = await pool.query("SELECT * FROM zones WHERE type = 'charging' OR name ILIKE '%charg%'").catch(() => ({ rows: [] }));
    const horizon = req.body?.horizon_hours || 8;
    const prompt = `You are a fleet battery-optimization AI. Plan charging for the next ${horizon} hours given the robots and charging stations.

Robots:
${JSON.stringify(robots.rows)}

Charging stations / zones:
${JSON.stringify(stations.rows)}

Return JSON: {schedule:[{robot_id,start,duration_min,station,reason}], priority_charges:[], deferred_charges:[], queue_collisions:[], expected_idle_time_avoided_min, recommendations:[], summary}.`;
    const out = await callOpenRouter(prompt, 'battery-optimization', `${robots.rows.length} robots, ${stations.rows.length} stations`);
    res.json(out);
  } catch (err) {
    console.error('AI battery optimization error:', err);
    res.status(500).json({ error: 'Battery optimization failed' });
  }
});

// POST /api/ai/zone-heat-map (identify bottlenecks)
router.post('/zone-heat-map', async (req, res) => {
  try {
    const zones = await pool.query('SELECT * FROM zones ORDER BY id').catch(() => ({ rows: [] }));
    const tasks = await pool.query("SELECT zone_id, status, COUNT(*) as cnt FROM tasks GROUP BY zone_id, status").catch(() => ({ rows: [] }));
    const collisions = await pool.query('SELECT zone_id, COUNT(*) as cnt FROM collisions GROUP BY zone_id').catch(() => ({ rows: [] }));
    const prompt = `You are a warehouse-flow analyst. Build a zone heat-map identifying bottlenecks given zone metadata, task throughput, and recent collisions.

Zones:
${JSON.stringify(zones.rows)}

Task counts by zone & status:
${JSON.stringify(tasks.rows)}

Collisions by zone:
${JSON.stringify(collisions.rows)}

Return JSON: {zones:[{zone_id,name,heat_score:0-100,bottleneck_type:"throughput|congestion|breakdown|none",evidence,actions}], top_bottlenecks:[zone_id], coldspots:[zone_id], routing_recommendations:[], summary}.`;
    const out = await callOpenRouter(prompt, 'zone-heat-map', `${zones.rows.length} zones`);
    res.json(out);
  } catch (err) {
    console.error('AI zone heat-map error:', err);
    res.status(500).json({ error: 'Zone heat-map failed' });
  }
});

// POST /api/ai/fault-diagnosis (when robot fails, diagnose cause)
router.post('/fault-diagnosis', async (req, res) => {
  try {
    const { robot_id, fault_code, symptoms } = req.body || {};
    if (!robot_id) return res.status(400).json({ error: 'robot_id is required' });
    const robotRes = await pool.query('SELECT * FROM robots WHERE id = $1', [robot_id]);
    if (!robotRes.rows.length) return res.status(404).json({ error: 'robot not found' });
    const maintRes = await pool.query('SELECT * FROM maintenance WHERE robot_id = $1 ORDER BY created_at DESC LIMIT 10', [robot_id]).catch(() => ({ rows: [] }));
    const prompt = `You are a robot fault-diagnosis AI. Diagnose the failure given fault code, symptoms, robot record, and recent maintenance history.

Robot: ${JSON.stringify(robotRes.rows[0])}
Fault code: ${fault_code || 'unknown'}
Symptoms: ${JSON.stringify(symptoms || [])}
Recent maintenance: ${JSON.stringify(maintRes.rows)}

Return JSON: {ranked_causes:[{cause,probability,evidence,confirmation_steps:[]}], immediate_actions:[{action,owner,priority}], parts_likely_needed:[{part,quantity}], expected_downtime_hours, escalate_to_vendor:bool, summary}.`;
    const out = await callOpenRouter(prompt, 'fault-diagnosis', `robot:${robot_id} code:${fault_code || ''}`);
    res.json(out);
  } catch (err) {
    console.error('AI fault diagnosis error:', err);
    res.status(500).json({ error: 'Fault diagnosis failed' });
  }
});

// POST /api/ai/robot-health-dashboard (aggregate fleet telemetry → health summary)
router.post('/robot-health-dashboard', async (req, res) => {
  try {
    const robots = await pool.query("SELECT id, name, type, status, battery_level, current_zone, payload_capacity, speed, last_maintenance FROM robots ORDER BY id LIMIT 100").catch(() => ({ rows: [] }));
    const maint = await pool.query("SELECT robot_id, type, status, scheduled_date, completed_date FROM maintenance ORDER BY scheduled_date DESC LIMIT 200").catch(() => ({ rows: [] }));
    const collisions = await pool.query("SELECT robot1_id, robot2_id, COUNT(*)::int as cnt FROM collisions GROUP BY robot1_id, robot2_id").catch(() => ({ rows: [] }));
    const taskStats = await pool.query("SELECT assigned_robot_id, status, COUNT(*)::int as cnt FROM tasks GROUP BY assigned_robot_id, status").catch(() => ({ rows: [] }));

    const lowBattery = robots.rows.filter(r => (r.battery_level ?? 100) < 30);
    const offline = robots.rows.filter(r => r.status === 'offline' || r.status === 'maintenance');

    const prompt = `You are a fleet health analyst. Build a robot-health dashboard summary aggregating telemetry across the fleet.

Robots (${robots.rows.length}):
${JSON.stringify(robots.rows)}

Recent maintenance:
${JSON.stringify(maint.rows)}

Collision counts by robot pair:
${JSON.stringify(collisions.rows)}

Task counts by robot & status:
${JSON.stringify(taskStats.rows)}

Pre-computed flags:
- Low-battery (<30%): ${JSON.stringify(lowBattery.map(r => ({ id: r.id, name: r.name, battery: r.battery_level })))}
- Offline / in-maintenance: ${JSON.stringify(offline.map(r => ({ id: r.id, name: r.name, status: r.status })))}

Return JSON: {fleet_health_score: 0-100, fleet_summary, status_breakdown:{operational,maintenance,offline,charging}, robots:[{id,name,health_score:0-100,risk_level:"low|medium|high|critical",issues:[],recommended_actions:[]}], top_concerns:[], maintenance_priorities:[{robot_id,reason,urgency_days}], summary}.`;
    const out = await callOpenRouter(prompt, 'robot-health-dashboard', `${robots.rows.length} robots`);
    res.json(out);
  } catch (err) {
    if (err && err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI robot-health-dashboard error:', err);
    res.status(500).json({ error: 'Robot health dashboard failed' });
  }
});

// POST /api/ai/performance-benchmarking (compare actual throughput to theoretical max)
router.post('/performance-benchmarking', async (req, res) => {
  try {
    const windowDays = Math.max(1, Math.min(90, Number(req.body?.window_days) || 7));
    const robots = await pool.query("SELECT id, name, type, payload_capacity, speed FROM robots ORDER BY id LIMIT 100").catch(() => ({ rows: [] }));
    const completed = await pool.query(
      "SELECT assigned_robot_id, COUNT(*)::int as completed_cnt FROM tasks WHERE status = 'completed' GROUP BY assigned_robot_id"
    ).catch(() => ({ rows: [] }));
    const all = await pool.query(
      "SELECT status, COUNT(*)::int as cnt FROM tasks GROUP BY status"
    ).catch(() => ({ rows: [] }));
    const collisionsTotal = await pool.query("SELECT COUNT(*)::int as cnt FROM collisions").catch(() => ({ rows: [{ cnt: 0 }] }));
    const maintHours = await pool.query("SELECT robot_id, COUNT(*)::int as events FROM maintenance WHERE status IN ('completed','in_progress') GROUP BY robot_id").catch(() => ({ rows: [] }));

    const prompt = `You are a performance-benchmarking AI. Compare actual throughput against theoretical maximum across a ${windowDays}-day window.

Robots (with theoretical capacity & speed):
${JSON.stringify(robots.rows)}

Completed tasks per robot:
${JSON.stringify(completed.rows)}

Task status totals:
${JSON.stringify(all.rows)}

Total collisions in dataset: ${collisionsTotal.rows[0]?.cnt ?? 0}
Maintenance events per robot: ${JSON.stringify(maintHours.rows)}

Return JSON: {benchmark_window_days: ${windowDays}, fleet_throughput_actual, fleet_throughput_theoretical, fleet_efficiency_pct, robots:[{id,name,actual_tasks,theoretical_capacity,efficiency_pct,gap_drivers:[],recommendation}], top_performers:[], underperformers:[], biggest_efficiency_levers:[{lever,projected_gain_pct,effort:"low|medium|high"}], summary}.`;

    const out = await callOpenRouter(prompt, 'performance-benchmarking', `window=${windowDays}d, ${robots.rows.length} robots`);
    res.json(out);
  } catch (err) {
    if (err && err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI performance-benchmarking error:', err);
    res.status(500).json({ error: 'Performance benchmarking failed' });
  }
});

// POST /api/ai/dynamic-fleet-sizing — recommend optimal fleet size for forecast demand
router.post('/dynamic-fleet-sizing', async (req, res) => {
  try {
    const horizonHours = Math.max(1, Math.min(168, Number(req.body?.horizon_hours) || 24));
    const expectedTaskRate = req.body?.expected_task_rate_per_hour;
    const robots = await pool.query("SELECT id, name, type, status, payload_capacity, speed FROM robots ORDER BY id LIMIT 200").catch(() => ({ rows: [] }));
    const tasks = await pool.query("SELECT status, type, priority, COUNT(*)::int as cnt FROM tasks GROUP BY status, type, priority").catch(() => ({ rows: [] }));
    const zones = await pool.query("SELECT id, name, type, max_robots, current_robots FROM zones ORDER BY id").catch(() => ({ rows: [] }));

    const prompt = `You are a fleet-sizing AI. Recommend optimal fleet size for the next ${horizonHours}h given current capacity and demand signals.

Current robots (${robots.rows.length}): ${JSON.stringify(robots.rows)}
Task counts by status/type/priority: ${JSON.stringify(tasks.rows)}
Zones (capacity utilisation): ${JSON.stringify(zones.rows)}
${expectedTaskRate ? `Expected task arrival rate (per hour): ${expectedTaskRate}` : ''}

Return JSON: {recommended_fleet_size, current_fleet_size, sizing_gap, sizing_strategy:"scale_up|scale_down|hold", per_type_recommendations:[{type,target_count,current_count,reason}], staging_plan:[{when_hours,action,count,reason}], cost_impact_estimate, risk_factors:[], summary}.`;

    const out = await callOpenRouter(prompt, 'dynamic-fleet-sizing', `horizon=${horizonHours}h, ${robots.rows.length} robots`);
    res.json(out);
  } catch (err) {
    if (err && err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI dynamic-fleet-sizing error:', err);
    res.status(500).json({ error: 'Dynamic fleet sizing failed' });
  }
});

// POST /api/ai/zone-capacity-forecast — predict zone congestion over a horizon
router.post('/zone-capacity-forecast', async (req, res) => {
  try {
    const horizonHours = Math.max(1, Math.min(72, Number(req.body?.horizon_hours) || 12));
    const zones = await pool.query("SELECT id, name, type, max_robots, current_robots FROM zones ORDER BY id").catch(() => ({ rows: [] }));
    const inboundTasks = await pool.query("SELECT dest_zone_id as zone_id, status, COUNT(*)::int as cnt FROM tasks WHERE status IN ('pending','queued','in_progress') GROUP BY dest_zone_id, status").catch(() => ({ rows: [] }));
    const collisions = await pool.query("SELECT zone_id, COUNT(*)::int as cnt FROM collisions GROUP BY zone_id").catch(() => ({ rows: [] }));

    const prompt = `You are a zone-capacity forecasting AI. Predict per-zone congestion over the next ${horizonHours}h and recommend rebalancing actions.

Zones: ${JSON.stringify(zones.rows)}
Pending/queued/in-progress tasks by destination zone & status: ${JSON.stringify(inboundTasks.rows)}
Collisions by zone (historical): ${JSON.stringify(collisions.rows)}

Return JSON: {horizon_hours: ${horizonHours}, zones:[{zone_id,name,current_utilisation_pct,forecast_peak_utilisation_pct,forecast_peak_in_hours,risk_level:"low|medium|high|critical",recommended_actions:[]}], rebalancing_plan:[{from_zone,to_zone,robots_to_move,when_hours,reason}], summary}.`;

    const out = await callOpenRouter(prompt, 'zone-capacity-forecast', `${zones.rows.length} zones, horizon=${horizonHours}h`);
    res.json(out);
  } catch (err) {
    if (err && err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI zone-capacity-forecast error:', err);
    res.status(500).json({ error: 'Zone capacity forecast failed' });
  }
});

// POST /api/ai/charging-orchestration — autonomous charging schedule
router.post('/charging-orchestration', async (req, res) => {
  try {
    const minBatteryThreshold = Math.max(5, Math.min(50, Number(req.body?.min_battery_pct) || 25));
    const robots = await pool.query("SELECT id, name, status, battery_level, current_zone, last_charged_at FROM robots ORDER BY battery_level ASC NULLS LAST LIMIT 100").catch(() => ({ rows: [] }));
    const stations = await pool.query("SELECT id, name, type, current_robots, max_robots FROM zones WHERE type = 'charging' OR name ILIKE '%charg%'").catch(() => ({ rows: [] }));
    const tasksByRobot = await pool.query("SELECT assigned_robot_id, COUNT(*)::int as queued FROM tasks WHERE status IN ('pending','queued','in_progress') GROUP BY assigned_robot_id").catch(() => ({ rows: [] }));

    const prompt = `You are an autonomous-charging orchestration AI. Build a charging schedule that keeps the fleet operational while respecting station capacity and robots' active task queues.

Robots (sorted low battery first): ${JSON.stringify(robots.rows)}
Charging stations / zones: ${JSON.stringify(stations.rows)}
Active task counts per robot: ${JSON.stringify(tasksByRobot.rows)}
Critical battery threshold: ${minBatteryThreshold}%

Return JSON: {immediate_charges:[{robot_id,station_id,reason}], scheduled_charges:[{robot_id,station_id,start_offset_min,duration_min,reason}], deferred_robots:[{robot_id,reason}], station_utilisation:[{station_id,scheduled_count}], expected_uptime_pct, conflicts:[], summary}.`;

    const out = await callOpenRouter(prompt, 'charging-orchestration', `${robots.rows.length} robots, threshold=${minBatteryThreshold}%`);
    res.json(out);
  } catch (err) {
    if (err && err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    console.error('AI charging-orchestration error:', err);
    res.status(500).json({ error: 'Charging orchestration failed' });
  }
});

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM ai_results');
    const result = await pool.query('SELECT * FROM ai_results ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching AI history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
