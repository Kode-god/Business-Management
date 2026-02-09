import {User} from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

export const addUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const businessId = req.user.businessId;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can add users' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      businessId
    });

    await user.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: 'create',
      recordType: 'User',
      recordId: user._id.toString(),
      description: `Added ${role} user: ${email}`
    });

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const users = await User.find({ businessId }).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, role, isActive } = req.body;
    const businessId = req.user.businessId;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can update users' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findOne({ _id: userId, businessId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldData = { firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive };

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.role = role || user.role;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    await user.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: 'update',
      recordType: 'User',
      recordId: userId,
      changes: { before: oldData, after: { firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive } },
      description: `Updated user: ${user.email}`
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const businessId = req.user.businessId;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can delete users' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findOne({ _id: userId, businessId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(userId);

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: 'delete',
      recordType: 'User',
      recordId: userId,
      description: `Deleted user: ${user.email}`
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
