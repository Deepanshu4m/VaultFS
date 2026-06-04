import express from 'express';
import { createBucket, getBuckets, deleteBucket } from '../controllers/bucket.controller.js';

const router = express.Router();

router.post('/', createBucket);
router.get('/', getBuckets);
router.delete('/:id', deleteBucket);

export default router;