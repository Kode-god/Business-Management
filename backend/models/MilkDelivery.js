import mongoose from 'mongoose';

const milkDeliverySchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  orderedQuantity: {
    type: Number,
    required: true
  },
  actualQuantity: {
    type: Number,
    required: true
  },
  bonusLiters: {
    type: Number,
    default: 0
  },
  boilingYieldPercentage: {
    type: Number,
    default: 0
  },
  quantityAfterBoiling: {
    type: Number,
    default: 0
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
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

milkDeliverySchema.index({ businessId: 1, date: 1 });
milkDeliverySchema.index({ supplierId: 1, date: 1 });

export default mongoose.model('MilkDelivery', milkDeliverySchema);
