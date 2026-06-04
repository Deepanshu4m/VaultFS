import pool from '../config/db.js';

export const createBucket = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Bucket name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO buckets (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Bucket name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBuckets = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buckets ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBucket = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM buckets WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bucket not found' });
    }
    res.status(200).json({ message: 'Bucket deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};