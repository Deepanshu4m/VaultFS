import express from 'express';
import { generateKey } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/generate-key', generateKey);

export default router;