import fs from 'fs';
import pool from '../config/db.js';
import { getActiveNodes, chunkBuffer, saveChunk, readChunk } from '../services/storage.service.js';
import path from 'path';

export const uploadFile = async (req, res) => {
  const { bucketId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { originalname, mimetype, size, buffer } = req.file;

  try {
    // check bucket exists
    const bucket = await pool.query('SELECT * FROM buckets WHERE id = $1', [bucketId]);
    if (bucket.rows.length === 0) {
      return res.status(404).json({ message: 'Bucket not found' });
    }

    // get active nodes
    const nodes = await getActiveNodes();
    if (nodes.length === 0) {
      return res.status(500).json({ message: 'No storage nodes available' });
    }

    // save file metadata
    const fileResult = await pool.query(
      'INSERT INTO files (bucket_id, name, size, mime_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [bucketId, originalname, size, mimetype]
    );
    const file = fileResult.rows[0];

    // chunk the file
    const chunks = chunkBuffer(buffer);

    // save each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // save chunk metadata
      const chunkResult = await pool.query(
        'INSERT INTO chunks (file_id, chunk_index, size) VALUES ($1, $2, $3) RETURNING *',
        [file.id, i, chunk.length]
      );
      const chunkRecord = chunkResult.rows[0];

      // replicate to 2 nodes (or all if less than 2)
      const replicationNodes = nodes.slice(0, Math.min(2, nodes.length));

      for (const node of replicationNodes) {
        const filename = `file_${file.id}_chunk_${i}_node_${node.id}`;
        const filePath = saveChunk(node.path, filename, chunk);

        await pool.query(
          'INSERT INTO chunk_nodes (chunk_id, node_id, file_path) VALUES ($1, $2, $3)',
          [chunkRecord.id, node.id, filePath]
        );
      }
    }

    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    const file = fileResult.rows[0];

    const chunksResult = await pool.query(
      'SELECT * FROM chunks WHERE file_id = $1 ORDER BY chunk_index ASC',
      [fileId]
    );

    const buffers = [];

    for (const chunk of chunksResult.rows) {
      const replicasResult = await pool.query(
        `SELECT cn.file_path, n.id as node_id 
         FROM chunk_nodes cn 
         JOIN nodes n ON cn.node_id = n.id 
         WHERE cn.chunk_id = $1 AND n.is_active = TRUE`,
        [chunk.id]
      );

      if (replicasResult.rows.length === 0) {
        return res.status(500).json({ message: `No active replicas for chunk ${chunk.chunk_index}` });
      }

      let chunkData = null;

      for (const replica of replicasResult.rows) {
        try {
          chunkData = readChunk(replica.file_path);
          break;
        } catch (err) {
          console.warn(`Node ${replica.node_id} failed for chunk ${chunk.chunk_index}, trying next replica...`);

          await pool.query(
            'UPDATE nodes SET is_active = FALSE WHERE id = $1',
            [replica.node_id]
          );
        }
      }

      if (!chunkData) {
        return res.status(500).json({ message: `All replicas failed for chunk ${chunk.chunk_index}` });
      }

      buffers.push(chunkData);
    }

    const finalBuffer = Buffer.concat(buffers);

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(finalBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listFiles = async (req, res) => {
  const { bucketId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE bucket_id = $1 ORDER BY created_at DESC',
      [bucketId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    // WHY: Before we delete from DB, we need the disk paths of all chunks
    // WHAT: Join chunks → chunk_nodes to get every file_path stored on every node
    // EFFECT: Gives us the full list of physical files to delete from disk
    const chunkPathsResult = await pool.query(
      `SELECT cn.file_path 
       FROM chunk_nodes cn
       JOIN chunks c ON cn.chunk_id = c.id
       WHERE c.file_id = $1`,
      [fileId]
    );

    // WHY: Actually remove the physical chunk files from disk
    // WHAT: fs.unlink — async Node.js file deletion
    // EFFECT: Frees up disk space on the storage nodes; no orphaned files left behind
    for (const row of chunkPathsResult.rows) {
      try {
        await fs.promises.unlink(row.file_path);
      } catch (err) {
        // WHY: If a file is already missing from disk (node crashed, manual deletion),
        //      we don't want that to block the DB cleanup
        // EFFECT: Logs the issue but continues deleting the rest
        console.warn(`Could not delete chunk file: ${row.file_path}`, err.message);
      }
    }

    // WHY: Now that disk is clean, remove the DB record
    // WHAT: CASCADE on schema means chunks + chunk_nodes rows auto-delete
    // EFFECT: DB and disk are both clean — no orphans anywhere
    const result = await pool.query(
      'DELETE FROM files WHERE id = $1 RETURNING *',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};