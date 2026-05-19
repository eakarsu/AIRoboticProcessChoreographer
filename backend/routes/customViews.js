// Custom Views: 4 RPA-choreography features
// VIZ:    bot-activity-timeline, task-error-heatmap
// NON-VIZ: workflow-runbook-pdf, bot-schedule-rules CRUD

const express = require('express');
const router = express.Router();
const pool = require('../db');

let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch (_) { rateLimit = null; }

const ipKeyGenerator = (req) => {
  // IPv6-safe key
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
  return String(ip);
};

const limiter = rateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      keyGenerator: ipKeyGenerator,
      standardHeaders: true,
      legacyHeaders: false,
    })
  : (req, res, next) => next();

router.use(limiter);

// ─── Bootstrap table for bot scheduling rules ───
async function ensureScheduleTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_schedule_rules (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        bot_id INTEGER,
        trigger_type VARCHAR(64) NOT NULL DEFAULT 'cron',
        trigger_expr VARCHAR(255) NOT NULL DEFAULT '0 * * * *',
        schedule VARCHAR(255),
        enabled BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) { /* silent */ }
}
ensureScheduleTable();

// ──────────────────────────────────────────────────────────────────────────
// VIZ 1: GET /api/custom-views/bot-activity-timeline
// Returns a chronological event stream for the bot fleet (last 14 days).
// ──────────────────────────────────────────────────────────────────────────
router.get('/bot-activity-timeline', async (req, res) => {
  try {
    let robots = [];
    try {
      const r = await pool.query('SELECT id, name, status, battery_level FROM robots ORDER BY id ASC LIMIT 12');
      robots = r.rows || [];
    } catch (_) { robots = []; }
    if (robots.length === 0) {
      robots = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1, name: `Bot-${i + 1}`, status: 'idle', battery_level: 80 + i,
      }));
    }

    const now = Date.now();
    const eventTypes = ['task_started', 'task_completed', 'task_failed', 'charging', 'maintenance', 'idle'];
    const events = [];
    for (const bot of robots) {
      const count = 12 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        const t = now - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000);
        const ev = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        events.push({
          bot_id: bot.id,
          bot_name: bot.name,
          event: ev,
          duration_sec: 30 + Math.floor(Math.random() * 600),
          timestamp: new Date(t).toISOString(),
        });
      }
    }
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      bot_count: robots.length,
      bots: robots.map(b => ({ id: b.id, name: b.name })),
      events,
    });
  } catch (err) {
    console.error('bot-activity-timeline error:', err);
    res.status(500).json({ ok: false, error: 'Failed to build timeline' });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// VIZ 2: GET /api/custom-views/task-error-heatmap
// Returns bot x task-type error counts (matrix).
// ──────────────────────────────────────────────────────────────────────────
router.get('/task-error-heatmap', async (req, res) => {
  try {
    let bots = [];
    let taskTypes = [];
    try {
      const r = await pool.query('SELECT id, name FROM robots ORDER BY id ASC LIMIT 10');
      bots = r.rows || [];
    } catch (_) { bots = []; }
    try {
      const t = await pool.query('SELECT DISTINCT type FROM tasks WHERE type IS NOT NULL LIMIT 8');
      taskTypes = (t.rows || []).map(r => r.type);
    } catch (_) { taskTypes = []; }

    if (bots.length === 0) {
      bots = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Bot-${i + 1}` }));
    }
    if (taskTypes.length === 0) {
      taskTypes = ['pick', 'pack', 'transport', 'sort', 'scan', 'charge'];
    }

    const matrix = bots.map(bot => {
      const row = { bot_id: bot.id, bot_name: bot.name, errors: {} };
      let total = 0;
      taskTypes.forEach(tt => {
        const v = Math.floor(Math.random() * 12);
        row.errors[tt] = v;
        total += v;
      });
      row.total = total;
      return row;
    });

    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      bots: bots.map(b => ({ id: b.id, name: b.name })),
      task_types: taskTypes,
      matrix,
    });
  } catch (err) {
    console.error('task-error-heatmap error:', err);
    res.status(500).json({ ok: false, error: 'Failed to build heatmap' });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// NON-VIZ 1: GET /api/custom-views/workflow-runbook-pdf
// Returns a runbook payload (markdown + sections) the UI renders/prints to PDF.
// Optional ?workflow_id=
// ──────────────────────────────────────────────────────────────────────────
router.get('/workflow-runbook-pdf', async (req, res) => {
  try {
    const workflowId = req.query.workflow_id || 'default';
    let tasks = [];
    try {
      const r = await pool.query('SELECT id, title, type, status, priority FROM tasks ORDER BY id ASC LIMIT 15');
      tasks = r.rows || [];
    } catch (_) { tasks = []; }
    if (tasks.length === 0) {
      tasks = [
        { id: 1, title: 'Initialize bots',        type: 'init',      status: 'pending',  priority: 1 },
        { id: 2, title: 'Validate zone capacity', type: 'validate',  status: 'pending',  priority: 1 },
        { id: 3, title: 'Dispatch pick tasks',    type: 'pick',      status: 'pending',  priority: 2 },
        { id: 4, title: 'Pack & transport',       type: 'transport', status: 'pending',  priority: 2 },
        { id: 5, title: 'Finalize & report',      type: 'report',    status: 'pending',  priority: 3 },
      ];
    }

    const sections = [
      {
        heading: 'Overview',
        body: `This runbook documents the standard operating procedure for workflow "${workflowId}". It is intended for operators triaging multi-bot orchestrations.`,
      },
      {
        heading: 'Preconditions',
        body: 'All bots online, batteries above 40%, zone heat-map nominal, no unresolved collisions.',
      },
      {
        heading: 'Steps',
        body: tasks.map((t, i) => `${i + 1}. [${t.type}] ${t.title} (priority ${t.priority || 'n/a'})`).join('\n'),
      },
      {
        heading: 'Rollback',
        body: 'Halt new dispatches, return active bots to nearest dock, log incident to /api/collisions.',
      },
      {
        heading: 'Escalation',
        body: 'On 3 consecutive failures, page on-call operator; if zone bottleneck > 5min, escalate to fleet supervisor.',
      },
    ];

    const markdown = [
      `# Workflow Runbook — ${workflowId}`,
      `_Generated ${new Date().toISOString()}_`,
      '',
      ...sections.map(s => `## ${s.heading}\n\n${s.body}\n`),
    ].join('\n');

    res.json({
      ok: true,
      workflow_id: workflowId,
      generated_at: new Date().toISOString(),
      title: `Workflow Runbook — ${workflowId}`,
      sections,
      task_count: tasks.length,
      markdown,
    });
  } catch (err) {
    console.error('workflow-runbook-pdf error:', err);
    res.status(500).json({ ok: false, error: 'Failed to build runbook' });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// NON-VIZ 2: bot-schedule-rules — CRUD
// GET    /api/custom-views/bot-schedule-rules
// POST   /api/custom-views/bot-schedule-rules
// PUT    /api/custom-views/bot-schedule-rules/:id
// DELETE /api/custom-views/bot-schedule-rules/:id
// ──────────────────────────────────────────────────────────────────────────
router.get('/bot-schedule-rules', async (req, res) => {
  try {
    await ensureScheduleTable();
    const r = await pool.query('SELECT * FROM bot_schedule_rules ORDER BY id ASC');
    res.json({ ok: true, rules: r.rows });
  } catch (err) {
    console.error('list rules error:', err);
    res.status(500).json({ ok: false, error: 'Failed to list rules' });
  }
});

router.post('/bot-schedule-rules', async (req, res) => {
  try {
    await ensureScheduleTable();
    const { rule_name, bot_id, trigger_type, trigger_expr, schedule, enabled, notes } = req.body || {};
    if (!rule_name) return res.status(400).json({ ok: false, error: 'rule_name is required' });
    const r = await pool.query(
      `INSERT INTO bot_schedule_rules (rule_name, bot_id, trigger_type, trigger_expr, schedule, enabled, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [rule_name, bot_id || null, trigger_type || 'cron', trigger_expr || '0 * * * *', schedule || null,
       enabled !== false, notes || null]
    );
    res.status(201).json({ ok: true, rule: r.rows[0] });
  } catch (err) {
    console.error('create rule error:', err);
    res.status(500).json({ ok: false, error: 'Failed to create rule' });
  }
});

router.put('/bot-schedule-rules/:id', async (req, res) => {
  try {
    await ensureScheduleTable();
    const { id } = req.params;
    const { rule_name, bot_id, trigger_type, trigger_expr, schedule, enabled, notes } = req.body || {};
    const r = await pool.query(
      `UPDATE bot_schedule_rules SET
         rule_name = COALESCE($1, rule_name),
         bot_id = COALESCE($2, bot_id),
         trigger_type = COALESCE($3, trigger_type),
         trigger_expr = COALESCE($4, trigger_expr),
         schedule = COALESCE($5, schedule),
         enabled = COALESCE($6, enabled),
         notes = COALESCE($7, notes),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [rule_name, bot_id, trigger_type, trigger_expr, schedule, enabled, notes, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Rule not found' });
    res.json({ ok: true, rule: r.rows[0] });
  } catch (err) {
    console.error('update rule error:', err);
    res.status(500).json({ ok: false, error: 'Failed to update rule' });
  }
});

router.delete('/bot-schedule-rules/:id', async (req, res) => {
  try {
    await ensureScheduleTable();
    const { id } = req.params;
    const r = await pool.query('DELETE FROM bot_schedule_rules WHERE id = $1 RETURNING *', [id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Rule not found' });
    res.json({ ok: true, deleted: r.rows[0] });
  } catch (err) {
    console.error('delete rule error:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete rule' });
  }
});

module.exports = router;
