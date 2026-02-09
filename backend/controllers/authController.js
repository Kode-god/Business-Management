import User from '../models/User.js';
import Business from '../models/Business.js';
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, businessId: user.businessId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const registerOwner = async (req, res) => {
  try {
    const { email, password, firstName, lastName, businessName, businessType, location } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const businessCount = await Business.countDocuments();
    if (businessCount >= 10) {
      return res.status(400).json({ success: false, message: 'Maximum businesses limit reached' });
    }

    user = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'owner',
      businessId: null
    });

    await user.save();

    const business = new Business({
      name: businessName,
      businessType,
      location,
      ownerId: user._id
    });

    await business.save();

    user.businessId = business._id;
    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Owner registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        businessId: business._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is inactive' });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('businessId');

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
