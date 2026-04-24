const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/maintenance
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maintenance ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching maintenance records:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM maintenance WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching maintenance record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance
router.post('/', async (req, res) => {
  try {
    const { robot_id, type, status, scheduled_date, completed_date, notes, cost, technician } = req.body;
    const result = await pool.query(
      `INSERT INTO maintenance (robot_id, type, status, scheduled_date, completed_date, notes, cost, technician)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [robot_id, type, status || 'scheduled', scheduled_date, completed_date, notes, cost, technician]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating maintenance record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/maintenance/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { robot_id, type, status, scheduled_date, completed_date, notes, cost, technician } = req.body;
    const result = await pool.query(
      `UPDATE maintenance SET robot_id = COALESCE($1, robot_id), type = COALESCE($2, type),
       status = COALESCE($3, status), scheduled_date = COALESCE($4, scheduled_date),
       completed_date = COALESCE($5, completed_date), notes = COALESCE($6, notes),
       cost = COALESCE($7, cost), technician = COALESCE($8, technician) WHERE id = $9 RETURNING *`,
      [robot_id, type, status, scheduled_date, completed_date, notes, cost, technician, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating maintenance record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM maintenance WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json({ message: 'Maintenance record deleted successfully', maintenance: result.rows[0] });
  } catch (err) {
    console.error('Error deleting maintenance record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
