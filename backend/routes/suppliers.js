import express from 'express';
import { createSupplier, getSuppliers, getSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createSupplier);
router.get('/', protect, getSuppliers);
router.get('/:supplierId', protect, getSupplier);
router.put('/:supplierId', protect, updateSupplier);
router.delete('/:supplierId', protect, authorize('owner'), deleteSupplier);

export default router;
