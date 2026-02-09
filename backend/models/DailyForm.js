import mongoose from 'mongoose';

const dailyFormSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },

    date: { type: Date, required: true },
    shift: { type: String, enum: ['Morning', 'Evening'], default: 'Morning' },

    status: { type: String, enum: ['draft', 'submitted', 'locked'], default: 'draft' },

    // Header
    kplcMeterOpening: { type: Number, default: 0 },
    kplcMeterClosing: { type: Number, default: 0 },

    // Table 1: suppliers
    supplierEntries: [
      {
        supplierName: { type: String, required: true, trim: true },
        product: { type: String, default: 'Milk', trim: true },
        orderedQty: { type: Number, default: 0 },
        actualQty: { type: Number, default: 0 },
        bonusQty: { type: Number, default: 0 }, // computed server-side
        qtyAfterBoiling: { type: Number, default: 0 },
      },
    ],

    // Table 2: stock + sales in one table
    items: [
      {
        itemCode: { type: String, required: true, trim: true },
        itemName: { type: String, required: true, trim: true },

        openingStock: { type: Number, default: 0 },
        newStockIn: { type: Number, default: 0 },
        spoiledDisposed: { type: Number, default: 0 },

        totalAvailable: { type: Number, default: 0 }, // computed
        qtySold: { type: Number, default: 0 },

        salesCash: { type: Number, default: 0 },
        salesBank: { type: Number, default: 0 },
        salesDebt: { type: Number, default: 0 },

        closingStock: { type: Number, default: 0 }, // computed
      },
    ],

    expenses: [
      {
        category: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        amount: { type: Number, default: 0 },
        paymentMethod: { type: String, enum: ['cash', 'bank', 'mobile', 'other'], default: 'cash' },
      },
    ],

    cashSummary: {
      totalCashIn: { type: Number, default: 0 },
      totalBankIn: { type: Number, default: 0 },
      totalDebt: { type: Number, default: 0 },

      totalExpenses: { type: Number, default: 0 },

      expectedCashAtHand: { type: Number, default: 0 },
      actualCashCounted: { type: Number, default: 0 },
      cashDifference: { type: Number, default: 0 },
      differenceExplanation: { type: String, default: '' },
    },

    notes: { type: String, default: '' },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One form per business per date per shift
dailyFormSchema.index({ businessId: 1, date: 1, shift: 1 }, { unique: true });

export default mongoose.model('DailyForm', dailyFormSchema);
