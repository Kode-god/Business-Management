// routes/auth.js
import express from 'express';
import { User } from '../models/User.js';
import Business from '../models/Business.js'; // your business model exports default
import { generateToken, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, businessName, businessType, location } = req.body;

    // require the fields your Business model needs too (location is required there)
    if (!firstName || !lastName || !email || !password || !businessName || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'Email already registered' });

    // 1) create owner user first (no businessId yet)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'owner',
      businessId: null,
    });

    // 2) create business with required ownerId + correct field name
    const business = await Business.create({
      name: businessName,
      businessType,   // ✅ correct schema field
      location,
      ownerId: user._id, // ✅ required by your business model
    });

    // 3) link user to business
    user.businessId = business._id;
    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      role: user.role,
      business: {
        id: business._id,
        name: business.name,
        businessType: business.businessType,
        location: business.location,
      },
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // ✅ Block deactivated users BEFORE password check (optional but fine)
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is deactivated. Contact the owner.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user);

    let business = null;
    if (user.businessId) {
      const b = await Business.findById(user.businessId);
      if (b) {
        business = {
          id: b._id,
          name: b.name,
          businessType: b.businessType,
          location: b.location,
        };
      }
    }

    return res.json({
      success: true,
      token,
      role: user.role,
      business,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        businessId: user.businessId,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  return res.json({ success: true, user });
});

export default router;
