// models/Business.js
import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    // Expanded to match your Register.jsx values + your older enum
    businessType: {
      type: String,
      enum: ['dairy', 'processor', 'distributor', 'milk', 'retail', 'service', 'other'],
      default: 'other',
      index: true,
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: 200,
    },

    // Owner user (required): aligns with your roles ("owner")
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Optional: nice-to-have for unique business URLs, receipts, etc.
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Helpful indexes (optional but recommended)
businessSchema.index({ ownerId: 1, name: 1 });
businessSchema.index({ slug: 1 }, { unique: false });

export default mongoose.model('Business', businessSchema);
