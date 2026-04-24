const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/operators
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM operators ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching operators:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/operators/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM operators WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching operator:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/operators
router.post('/', async (req, res) => {
  try {
    const { name, email, role, shift, certification_level, active, phone, hire_date } = req.body;
    const result = await pool.query(
      `INSERT INTO operators (name, email, role, shift, certification_level, active, phone, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, email, role, shift, certification_level || 'basic', active !== undefined ? active : true, phone, hire_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating operator:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/operators/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, shift, certification_level, active, phone, hire_date } = req.body;
    const result = await pool.query(
      `UPDATE operators SET name = COALESCE($1, name), email = COALESCE($2, email),
       role = COALESCE($3, role), shift = COALESCE($4, shift),
       certification_level = COALESCE($5, certification_level), active = COALESCE($6, active),
       phone = COALESCE($7, phone), hire_date = COALESCE($8, hire_date) WHERE id = $9 RETURNING *`,
      [name, email, role, shift, certification_level, active, phone, hire_date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating operator:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/operators/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM operators WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }
    res.json({ message: 'Operator deleted successfully', operator: result.rows[0] });
  } catch (err) {
    console.error('Error deleting operator:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
