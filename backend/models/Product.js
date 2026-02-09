import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    itemCode: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      default: "pcs", // pcs | litres | kg | etc
      trim: true,
    },

    category: {
      type: String,
      default: "general",
      trim: true,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    reorderLevel: {
      type: Number,
      min: 0,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Unique per business
productSchema.index({ businessId: 1, itemCode: 1 }, { unique: true });

export default mongoose.model("Product", productSchema);
