import express from 'express';
import { createBucket, getBuckets, deleteBucket } from '../controllers/bucket.controller.js';
import { requireApiKey } from '../middlewares/auth.middleware.js';

const router = express.Router();

// WHY: requireApiKey is listed BEFORE the controller function
// WHAT: Express runs middleware left to right — so auth runs first, controller second
// EFFECT: No valid key = never reaches createBucket/getBuckets/deleteBucket
router.post('/', requireApiKey, createBucket);
router.get('/', requireApiKey, getBuckets);
router.delete('/:id', requireApiKey, deleteBucket);

export default router;