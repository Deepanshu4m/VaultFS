import express from 'express';
import { registerNode, listNodes, deactivateNode } from '../controllers/node.controller.js';

const router = express.Router();

router.post('/', registerNode);
router.get('/', listNodes);
router.patch('/:id/deactivate', deactivateNode);

export default router;