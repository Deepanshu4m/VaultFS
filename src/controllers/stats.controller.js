import pool from '../config/db.js';

export const getStats = async (req, res) => {
  try {

    const overviewResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM buckets) AS total_buckets,
        (SELECT COUNT(*) FROM files) AS total_files,
        (SELECT COALESCE(SUM(size), 0) FROM files) AS total_size_bytes,
        (SELECT COUNT(*) FROM chunks) AS total_chunks
    `);

    const nodesResult = await pool.query(`
      SELECT 
        n.id,
        n.path,
        n.is_active,
        COUNT(cn.id) AS chunks_stored
      FROM nodes n
      LEFT JOIN chunk_nodes cn ON cn.node_id = n.id
      GROUP BY n.id
      ORDER BY n.id ASC
    `);

    const overview = overviewResult.rows[0];

    res.status(200).json({
      total_buckets: parseInt(overview.total_buckets),
      total_files: parseInt(overview.total_files),
      total_size_bytes: parseInt(overview.total_size_bytes),
      total_chunks: parseInt(overview.total_chunks),
      nodes: nodesResult.rows.map(node => ({
        id: node.id,
        path: node.path,
        is_active: node.is_active,
        chunks_stored: parseInt(node.chunks_stored)
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};