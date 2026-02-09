import express from 'express';
import { getBusiness, updateBusiness, getBusinessStats } from '../controllers/businessController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getBusiness);
router.put('/', protect, authorize('owner'), updateBusiness);
router.get('/stats', protect, getBusinessStats);

export default router;
