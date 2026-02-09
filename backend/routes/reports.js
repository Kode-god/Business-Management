import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  dailySummary,
  weeklySales,
  weeklyExpenses,
  stockBalance,
  monthlySummary,
} from '../controllers/reportController.js';

const router = express.Router();

// Everyone logged in can view reports; you can restrict later if needed.
router.get('/daily-summary/:formId', protect, dailySummary);

// weekly reports (owner/manager typically, but you can allow cashier too)
router.get('/weekly-sales', protect, authorize('owner', 'manager'), weeklySales);
router.get('/weekly-expenses', protect, authorize('owner', 'manager'), weeklyExpenses);

// stock balance
router.get('/stock-balance', protect, authorize('owner', 'manager'), stockBalance);

// monthly
router.get('/monthly-summary', protect, authorize('owner', 'manager'), monthlySummary);

export default router;
