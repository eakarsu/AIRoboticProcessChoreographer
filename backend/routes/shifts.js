const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/shifts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shifts ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shifts/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching shift:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shifts
router.post('/', async (req, res) => {
  try {
    const { name, start_time, end_time, operator_id, zone_id, robot_count, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO shifts (name, start_time, end_time, operator_id, zone_id, robot_count, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, start_time, end_time, operator_id, zone_id, robot_count || 0, status || 'scheduled', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating shift:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/shifts/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, operator_id, zone_id, robot_count, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE shifts SET name = COALESCE($1, name), start_time = COALESCE($2, start_time),
       end_time = COALESCE($3, end_time), operator_id = COALESCE($4, operator_id),
       zone_id = COALESCE($5, zone_id), robot_count = COALESCE($6, robot_count),
       status = COALESCE($7, status), notes = COALESCE($8, notes) WHERE id = $9 RETURNING *`,
      [name, start_time, end_time, operator_id, zone_id, robot_count, status, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating shift:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/shifts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted successfully', shift: result.rows[0] });
  } catch (err) {
    console.error('Error deleting shift:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
