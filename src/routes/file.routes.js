import express from 'express';
import multer from 'multer';
import { uploadFile, downloadFile, listFiles, deleteFile } from '../controllers/file.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/:bucketId/files', upload.single('file'), uploadFile);
router.get('/:bucketId/files', listFiles);
router.get('/:bucketId/files/:fileId', downloadFile);
router.delete('/:bucketId/files/:fileId', deleteFile);

export default router;