import crypto from 'crypto';
import pool from '../config/db.js';

export const generateKey = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const key = crypto.randomBytes(32).toString('hex');
    const result = await pool.query(
      'INSERT INTO api_keys (key, name) VALUES ($1, $2) RETURNING *',
      [key, name]
    );

    res.status(201).json({
      message: 'API key generated successfully',
      api_key: result.rows[0].key,
      name: result.rows[0].name,
      created_at: result.rows[0].created_at
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};