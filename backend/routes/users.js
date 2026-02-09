import express from 'express';
import { addUser, getUsers, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, addUser);
router.get('/', protect, getUsers);
router.put('/:userId', protect, authorize('owner'), updateUser);
router.delete('/:userId', protect, authorize('owner'), deleteUser);

export default router;
