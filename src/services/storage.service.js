import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

export const getActiveNodes = async () => {
  const result = await pool.query('SELECT * FROM nodes WHERE is_active = TRUE');
  return result.rows;
};

export const chunkBuffer = (buffer, chunkSize = 1024 * 1024) => {
  const chunks = [];
  let offset = 0;
  while (offset < buffer.length) {
    chunks.push(buffer.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
};

export const saveChunk = async (nodePath, filename, chunkBuffer) => {
  const fullPath = path.join(nodePath, filename);
  await fs.promises.writeFile(fullPath, chunkBuffer);
  return fullPath;
};

export const readChunk = async (filePath) => {
  return await fs.promises.readFile(filePath);
};