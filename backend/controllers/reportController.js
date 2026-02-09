import DailyForm from '../models/DailyForm.js';
import mongoose from 'mongoose';

const normalizeDate = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const weekRangeFromDate = (dateStr) => {
  const d = normalizeDate(dateStr);
  // Week starts Monday
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const monthRangeFromYYYYMM = (ym) => {
  // ym = "2026-02"
  const [y, m] = ym.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 0); // last day of month
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ------------------------------------
// 1) DAILY SUMMARY (PRINT FORM)
// GET /api/reports/daily-summary/:formId
// ------------------------------------
export const dailySummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { formId } = req.params;

    const form = await DailyForm.findOne({ _id: formId, businessId })
      .populate('recordedBy', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName email role');

    if (!form) return res.status(404).json({ success: false, message: 'Daily form not found' });

    // This is basically "print the daily form"
    return res.json({ success: true, form });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

// ------------------------------------
// 2) WEEKLY SALES REPORT
// GET /api/reports/weekly-sales?date=YYYY-MM-DD&shift=All|Morning|Evening
// ------------------------------------
export const weeklySales = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { date, shift = 'All' } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });

    const { start, end } = weekRangeFromDate(date);

    const match = {
      businessId: new mongoose.Types.ObjectId(businessId),
      date: { $gte: start, $lte: end },
      status: 'submitted',
    };
    if (shift !== 'All') match.shift = shift;

    // aggregate from item rows
    const agg = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          cash: { $sum: '$items.salesCash' },
          bank: { $sum: '$items.salesBank' },
          debt: { $sum: '$items.salesDebt' },
          totalSoldQty: { $sum: '$items.qtySold' },
        },
      },
      {
        $project: {
          _id: 0,
          cash: { $ifNull: ['$cash', 0] },
          bank: { $ifNull: ['$bank', 0] },
          debt: { $ifNull: ['$debt', 0] },
          totalSoldQty: { $ifNull: ['$totalSoldQty', 0] },
          totalSales: { $add: ['$cash', '$bank', '$debt'] },
        },
      },
    ]);

    // daily breakdown
    const daily = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { date: '$date', shift: '$shift' },
          cash: { $sum: '$items.salesCash' },
          bank: { $sum: '$items.salesBank' },
          debt: { $sum: '$items.salesDebt' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    return res.json({
      success: true,
      range: { start, end },
      shift,
      totals: agg[0] || { cash: 0, bank: 0, debt: 0, totalSoldQty: 0, totalSales: 0 },
      daily,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

// ------------------------------------
// 3) WEEKLY EXPENSES REPORT
// GET /api/reports/weekly-expenses?date=YYYY-MM-DD&shift=All|Morning|Evening
// ------------------------------------
export const weeklyExpenses = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { date, shift = 'All' } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });

    const { start, end } = weekRangeFromDate(date);

    const match = {
      businessId: new mongoose.Types.ObjectId(businessId),
      date: { $gte: start, $lte: end },
      status: 'submitted',
    };
    if (shift !== 'All') match.shift = shift;

    const totals = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$expenses' },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$expenses.amount' },
        },
      },
      { $project: { _id: 0, totalExpenses: { $ifNull: ['$totalExpenses', 0] } } },
    ]);

    const byCategory = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$expenses' },
      {
        $group: {
          _id: '$expenses.category',
          total: { $sum: '$expenses.amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return res.json({
      success: true,
      range: { start, end },
      shift,
      totals: totals[0] || { totalExpenses: 0 },
      byCategory,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

// ------------------------------------
// 4) STOCK BALANCE REPORT (range)
// GET /api/reports/stock-balance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&shift=All|Morning|Evening
// ------------------------------------
export const stockBalance = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate, shift = 'All' } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const start = normalizeDate(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const match = {
      businessId: new mongoose.Types.ObjectId(businessId),
      date: { $gte: start, $lte: end },
      status: 'submitted',
    };
    if (shift !== 'All') match.shift = shift;

    // Per item totals across range
    const perItem = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { code: '$items.itemCode', name: '$items.itemName' },
          totalOpening: { $sum: '$items.openingStock' },
          totalIn: { $sum: '$items.newStockIn' },
          totalSpoilt: { $sum: '$items.spoiledDisposed' },
          totalSold: { $sum: '$items.qtySold' },
          avgClosing: { $avg: '$items.closingStock' },
        },
      },
      { $sort: { '_id.code': 1 } },
      {
        $project: {
          _id: 0,
          itemCode: '$_id.code',
          itemName: '$_id.name',
          totalOpening: 1,
          totalIn: 1,
          totalSpoilt: 1,
          totalSold: 1,
          avgClosing: { $round: ['$avgClosing', 2] },
        },
      },
    ]);

    return res.json({ success: true, range: { start, end }, shift, perItem });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

// ------------------------------------
// 5) MONTHLY SUMMARY REPORT
// GET /api/reports/monthly-summary?month=YYYY-MM&shift=All|Morning|Evening
// ------------------------------------
export const monthlySummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { month, shift = 'All' } = req.query;
    if (!month) return res.status(400).json({ success: false, message: 'month is required (YYYY-MM)' });

    const { start, end } = monthRangeFromYYYYMM(month);

    const match = {
      businessId: new mongoose.Types.ObjectId(businessId),
      date: { $gte: start, $lte: end },
      status: 'submitted',
    };
    if (shift !== 'All') match.shift = shift;

    // Totals
    const totals = await DailyForm.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          daysSubmitted: { $sum: 1 },
          totalCashDifference: { $sum: '$cashSummary.cashDifference' },
          totalExpenses: { $sum: '$cashSummary.totalExpenses' },
          totalCashIn: { $sum: '$cashSummary.totalCashIn' },
          totalBankIn: { $sum: '$cashSummary.totalBankIn' },
          totalDebt: { $sum: '$cashSummary.totalDebt' },
        },
      },
      {
        $project: {
          _id: 0,
          daysSubmitted: 1,
          totalCashDifference: 1,
          totalExpenses: 1,
          totalCashIn: 1,
          totalBankIn: 1,
          totalDebt: 1,
          totalSales: { $add: ['$totalCashIn', '$totalBankIn', '$totalDebt'] },
          netCashPosition: { $subtract: ['$totalCashIn', '$totalExpenses'] },
        },
      },
    ]);

    // Expenses by category
    const expenseByCategory = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$expenses' },
      { $group: { _id: '$expenses.category', total: { $sum: '$expenses.amount' } } },
      { $sort: { total: -1 } },
    ]);

    // Supplier totals
    const supplierTotals = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$supplierEntries' },
      {
        $group: {
          _id: null,
          ordered: { $sum: '$supplierEntries.orderedQty' },
          actual: { $sum: '$supplierEntries.actualQty' },
          bonus: { $sum: '$supplierEntries.bonusQty' },
          afterBoiling: { $sum: '$supplierEntries.qtyAfterBoiling' },
        },
      },
      { $project: { _id: 0, ordered: 1, actual: 1, bonus: 1, afterBoiling: 1 } },
    ]);

    // Stock per item (monthly totals)
    const stockPerItem = await DailyForm.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { code: '$items.itemCode', name: '$items.itemName' },
          opening: { $sum: '$items.openingStock' },
          in: { $sum: '$items.newStockIn' },
          spoilt: { $sum: '$items.spoiledDisposed' },
          sold: { $sum: '$items.qtySold' },
          avgClosing: { $avg: '$items.closingStock' },
        },
      },
      { $sort: { sold: -1 } },
      {
        $project: {
          _id: 0,
          itemCode: '$_id.code',
          itemName: '$_id.name',
          opening: 1,
          in: 1,
          spoilt: 1,
          sold: 1,
          avgClosing: { $round: ['$avgClosing', 2] },
        },
      },
    ]);

    return res.json({
      success: true,
      month,
      range: { start, end },
      shift,
      totals: totals[0] || {
        daysSubmitted: 0,
        totalCashDifference: 0,
        totalExpenses: 0,
        totalCashIn: 0,
        totalBankIn: 0,
        totalDebt: 0,
        totalSales: 0,
        netCashPosition: 0,
      },
      expenseByCategory,
      supplierTotals: supplierTotals[0] || { ordered: 0, actual: 0, bonus: 0, afterBoiling: 0 },
      stockPerItem,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};
