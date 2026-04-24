const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, type, priority, status, assigned_robot_id, source_zone_id, dest_zone_id, payload_weight, deadline } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (title, type, priority, status, assigned_robot_id, source_zone_id, dest_zone_id, payload_weight, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, type, priority || 'medium', status || 'pending', assigned_robot_id, source_zone_id, dest_zone_id, payload_weight, deadline]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, priority, status, assigned_robot_id, source_zone_id, dest_zone_id, payload_weight, deadline } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET title = COALESCE($1, title), type = COALESCE($2, type), priority = COALESCE($3, priority),
       status = COALESCE($4, status), assigned_robot_id = COALESCE($5, assigned_robot_id),
       source_zone_id = COALESCE($6, source_zone_id), dest_zone_id = COALESCE($7, dest_zone_id),
       payload_weight = COALESCE($8, payload_weight), deadline = COALESCE($9, deadline) WHERE id = $10 RETURNING *`,
      [title, type, priority, status, assigned_robot_id, source_zone_id, dest_zone_id, payload_weight, deadline, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully', task: result.rows[0] });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
