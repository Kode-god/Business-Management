import express from 'express';
import { recordTransaction, getTransactions, getTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, recordTransaction);
router.get('/', protect, getTransactions);
router.get('/:transactionId', protect, getTransaction);
router.put('/:transactionId', protect, updateTransaction);
router.delete('/:transactionId', protect, authorize('owner'), deleteTransaction);

export default router;
