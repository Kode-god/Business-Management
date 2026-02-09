import mongoose from 'mongoose';

const spoilageSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  litersSpoilt: {
    type: Number,
    required: true
  },
  spoilagePercentage: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['expired', 'temperature', 'contamination', 'damage', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

spoilageSchema.index({ businessId: 1, date: 1 });

export default mongoose.model('Spoilage', spoilageSchema);
