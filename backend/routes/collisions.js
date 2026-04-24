const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/collisions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM collisions ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching collisions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/collisions/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM collisions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collision not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching collision:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/collisions
router.post('/', async (req, res) => {
  try {
    const { robot1_id, robot2_id, zone_id, severity, description, resolved, resolution_notes, occurred_at } = req.body;
    const result = await pool.query(
      `INSERT INTO collisions (robot1_id, robot2_id, zone_id, severity, description, resolved, resolution_notes, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [robot1_id, robot2_id, zone_id, severity || 'low', description, resolved || false, resolution_notes, occurred_at || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating collision:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/collisions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { robot1_id, robot2_id, zone_id, severity, description, resolved, resolution_notes, occurred_at } = req.body;
    const result = await pool.query(
      `UPDATE collisions SET robot1_id = COALESCE($1, robot1_id), robot2_id = COALESCE($2, robot2_id),
       zone_id = COALESCE($3, zone_id), severity = COALESCE($4, severity), description = COALESCE($5, description),
       resolved = COALESCE($6, resolved), resolution_notes = COALESCE($7, resolution_notes),
       occurred_at = COALESCE($8, occurred_at) WHERE id = $9 RETURNING *`,
      [robot1_id, robot2_id, zone_id, severity, description, resolved, resolution_notes, occurred_at, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collision not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating collision:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/collisions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM collisions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collision not found' });
    }
    res.json({ message: 'Collision deleted successfully', collision: result.rows[0] });
  } catch (err) {
    console.error('Error deleting collision:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
