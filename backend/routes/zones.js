const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/zones
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zones ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/zones/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM zones WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching zone:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/zones
router.post('/', async (req, res) => {
  try {
    const { name, type, width, height, max_robots, current_robots, status, description } = req.body;
    const result = await pool.query(
      `INSERT INTO zones (name, type, width, height, max_robots, current_robots, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, type, width, height, max_robots, current_robots || 0, status || 'active', description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/zones/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, width, height, max_robots, current_robots, status, description } = req.body;
    const result = await pool.query(
      `UPDATE zones SET name = COALESCE($1, name), type = COALESCE($2, type), width = COALESCE($3, width),
       height = COALESCE($4, height), max_robots = COALESCE($5, max_robots), current_robots = COALESCE($6, current_robots),
       status = COALESCE($7, status), description = COALESCE($8, description) WHERE id = $9 RETURNING *`,
      [name, type, width, height, max_robots, current_robots, status, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating zone:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/zones/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM zones WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ message: 'Zone deleted successfully', zone: result.rows[0] });
  } catch (err) {
    console.error('Error deleting zone:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
