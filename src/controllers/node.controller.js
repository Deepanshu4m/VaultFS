import fs from 'fs';
import pool from '../config/db.js';

export const registerNode = async (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ message: 'Node path is required' });
  }
  
  if (!fs.existsSync(path)) {
    return res.status(400).json({ message: `Path does not exist on disk: ${path}` });
  }

  try {
    const result = await pool.query(
      'INSERT INTO nodes (path) VALUES ($1) RETURNING *',
      [path]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Node with this path already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const listNodes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nodes ORDER BY id ASC'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deactivateNode = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE nodes SET is_active = FALSE WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Node not found' });
    }

    res.status(200).json({ message: 'Node deactivated', node: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};