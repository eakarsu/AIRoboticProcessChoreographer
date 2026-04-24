const express = require('express');
const router = express.Router();
const pool = require('../db');
const fetch = require('node-fetch');

async function callOpenRouter(prompt, feature) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
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
  const result = data.choices?.[0]?.message?.content || 'No response from AI';
  await pool.query(
    'INSERT INTO ai_results (feature, input_summary, result, model_used, tokens_used) VALUES ($1, $2, $3, $4, $5)',
    [feature, prompt.substring(0, 200), result, process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5', data.usage?.total_tokens || 0]
  );
  return { result, usage: data.usage };
}

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

    const prompt = `Run a warehouse simulation with the following parameters:

SCENARIO: ${scenario || 'Peak holiday season with 3x normal order volume'}
DURATION: ${duration || '8 hours'}
ROBOT COUNT: ${robotCount || robots.rows.length}

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

    const aiResult = await callOpenRouter(prompt, 'simulation');
    res.json(aiResult);
  } catch (err) {
    console.error('AI simulation error:', err);
    res.status(500).json({ error: 'AI simulation failed' });
  }
});

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_results ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching AI history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
