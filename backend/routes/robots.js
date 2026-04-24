const express = require('express');
const router = express.Router();
const pool = require('../db');

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

// PUT /api/robots/:id
router.put('/:id', async (req, res) => {
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
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating robot:', err);
    res.status(500).json({ error: 'Internal server error' });
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
