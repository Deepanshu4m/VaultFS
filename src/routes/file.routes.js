import express from 'express';
import { uploadFile, downloadFile, listFiles, deleteFile } from '../controllers/file.controller.js';
import { requireApiKey } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post('/:bucketId/files', requireApiKey, upload.single('file'), uploadFile);
router.get('/:bucketId/files', requireApiKey, listFiles);
router.get('/:bucketId/files/:fileId/download', requireApiKey, downloadFile);
router.delete('/:bucketId/files/:fileId', requireApiKey, deleteFile);

export default router;