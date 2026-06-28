import express from 'express';
import { registerNode, listNodes, deactivateNode } from '../controllers/node.controller.js';
import { requireApiKey } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', requireApiKey, registerNode);
router.get('/', requireApiKey, listNodes);
router.patch('/:id/deactivate', requireApiKey, deactivateNode);

export default router;