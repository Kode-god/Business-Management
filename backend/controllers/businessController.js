import Business from '../models/Business.js';
import {User} from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

export const getBusiness = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    res.status(200).json({
      success: true,
      business
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { name, location, phone, email, description } = req.body;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can update business' });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const oldData = { name: business.name, location: business.location, phone: business.phone, email: business.email };

    business.name = name || business.name;
    business.location = location || business.location;
    business.phone = phone || business.phone;
    business.email = email || business.email;
    business.description = description || business.description;

    await business.save();

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'update',
      recordType: 'Business',
      recordId: businessId.toString(),
      changes: { before: oldData, after: { name: business.name, location: business.location, phone: business.phone, email: business.email } },
      description: `Updated business information`
    });

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      business
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getBusinessStats = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const users = await User.countDocuments({ businessId });
    const business = await Business.findById(businessId);

    res.status(200).json({
      success: true,
      stats: {
        businessName: business.name,
        businessType: business.businessType,
        totalUsers: users,
        createdAt: business.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
