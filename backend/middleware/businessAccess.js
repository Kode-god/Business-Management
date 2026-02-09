import Business from '../models/Business.js';

export const verifyBusinessAccess = async (req, res, next) => {
  try {
    const businessId = req.params.businessId || req.body.businessId;

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    if (business.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to access this business' });
    }

    req.business = business;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
