const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { broadcastRobotUpdate } = require('../websocket');

// GET /api/robots
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM robots ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching robots:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/robots/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM robots WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Robot not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching robot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/robots
router.post('/', async (req, res) => {
  try {
    const { name, type, status, battery_level, current_zone, payload_capacity, speed, last_maintenance } = req.body;
    const result = await pool.query(
      `INSERT INTO robots (name, type, status, battery_level, current_zone, payload_capacity, speed, last_maintenance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, type, status || 'idle', battery_level || 100, current_zone, payload_capacity, speed, last_maintenance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating robot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/robots/:id — auth required, broadcasts WebSocket update
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, status, battery_level, current_zone, payload_capacity, speed, last_maintenance } = req.body;
    const result = await pool.query(
      `UPDATE robots SET name = COALESCE($1, name), type = COALESCE($2, type), status = COALESCE($3, status),
       battery_level = COALESCE($4, battery_level), current_zone = COALESCE($5, current_zone),
       payload_capacity = COALESCE($6, payload_capacity), speed = COALESCE($7, speed),
       last_maintenance = COALESCE($8, last_maintenance) WHERE id = $9 RETURNING *`,
      [name, type, status, battery_level, current_zone, payload_capacity, speed, last_maintenance, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Robot not found' });
    }
    const updatedRobot = result.rows[0];
    // Broadcast live update to WebSocket clients
    if (broadcastRobotUpdate) broadcastRobotUpdate(updatedRobot);
    res.json(updatedRobot);
  } catch (err) {
    console.error('Error updating robot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/robots/:id/oee — Overall Equipment Effectiveness
router.get('/:id/oee', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const robotRes = await pool.query('SELECT * FROM robots WHERE id = $1', [id]);
    if (robotRes.rows.length === 0) return res.status(404).json({ error: 'Robot not found' });
    const robot = robotRes.rows[0];

    // Completed tasks (performance indicator)
    const tasksRes = await pool.query(
      `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM tasks WHERE assigned_robot_id = $1`, [id]
    );
    const maintenanceRes = await pool.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as planned
       FROM maintenance WHERE robot_id = $1`, [id]
    );
    const collisionRes = await pool.query(
      `SELECT COUNT(*) as incidents FROM collisions WHERE robot1_id = $1 OR robot2_id = $1`, [id]
    );

    const totalTasks = parseInt(tasksRes.rows[0].total) || 1;
    const completedTasks = parseInt(tasksRes.rows[0].completed) || 0;
    const totalMaint = parseInt(maintenanceRes.rows[0].total) || 0;
    const plannedMaint = parseInt(maintenanceRes.rows[0].planned) || 0;
    const incidents = parseInt(collisionRes.rows[0].incidents) || 0;

    // OEE = Availability × Performance × Quality
    // Availability: 100% minus downtime estimate (collisions + unplanned maintenance reduce this)
    const unplannedMaint = totalMaint - plannedMaint;
    const availability = Math.max(0, 100 - (unplannedMaint * 5) - (incidents * 2)) / 100;
    // Performance: battery level as proxy for performance capability
    const performance = (robot.battery_level || 80) / 100;
    // Quality: task completion rate
    const quality = totalTasks > 0 ? completedTasks / totalTasks : 0.5;

    const oee = Math.round(availability * performance * quality * 100);

    res.json({
      robot_id: parseInt(id),
      robot_name: robot.name,
      oee_percent: oee,
      components: {
        availability: Math.round(availability * 100),
        performance: Math.round(performance * 100),
        quality: Math.round(quality * 100)
      },
      metrics: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        battery_level: robot.battery_level,
        collision_incidents: incidents,
        planned_maintenance: plannedMaint,
        unplanned_maintenance: unplannedMaint
      },
      interpretation: oee >= 85 ? 'World Class' : oee >= 60 ? 'Good' : oee >= 40 ? 'Average' : 'Needs Improvement'
    });
  } catch (err) {
    console.error('OEE calculation error:', err);
    res.status(500).json({ error: 'OEE calculation failed' });
  }
});

// DELETE /api/robots/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM robots WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Robot not found' });
    }
    res.json({ message: 'Robot deleted successfully', robot: result.rows[0] });
  } catch (err) {
    console.error('Error deleting robot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
