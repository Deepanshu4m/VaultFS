import Bull from 'bull';
import { saveChunk } from '../services/storage.service.js';
import pool from '../config/db.js';

export const replicationQueue = new Bull('replication', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

replicationQueue.process(async (job) => {
  const { nodePath, nodeId, filename, chunkData, chunkRecordId } = job.data;

  const buffer = Buffer.from(chunkData);
  const filePath = await saveChunk(nodePath, filename, buffer);

  await pool.query(
    'INSERT INTO chunk_nodes (chunk_id, node_id, file_path) VALUES ($1, $2, $3)',
    [chunkRecordId, nodeId, filePath]
  );

  console.log(`Replicated chunk ${chunkRecordId} to node ${nodeId}`);
});