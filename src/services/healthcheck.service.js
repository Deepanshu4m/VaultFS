import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

const checkNode = async (node) => {
  try {
    const testFile = path.join(node.path, '.healthcheck');
    await fs.promises.writeFile(testFile, 'ok');
    await fs.promises.readFile(testFile);
    await fs.promises.unlink(testFile);
    return true;
  } catch (err) {
    return false;
  }
};

export const startHealthCheck = async () => {
  console.log('Health check system started');

  setInterval(async () => {
    try {
      const result = await pool.query('SELECT * FROM nodes');
      const nodes = result.rows;

      for (const node of nodes) {
        const isHealthy = await checkNode(node);

        await pool.query(
          'UPDATE nodes SET is_active = $1 WHERE id = $2',
          [isHealthy, node.id]
        );

        if (!isHealthy) {
          console.warn(`Node ${node.id} (${node.path}) is DOWN — marked inactive`);
        } else {
          console.log(`Node ${node.id} (${node.path}) is healthy`);
        }
      }
    } catch (err) {
      console.error('Health check error:', err.message);
    }
  }, 30000);
};