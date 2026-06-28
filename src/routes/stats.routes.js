import express from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { requireApiKey } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', requireApiKey, getStats);

export default router;