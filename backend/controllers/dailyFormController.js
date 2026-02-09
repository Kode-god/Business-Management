// controllers/dailyFormController.js
import DailyForm from '../models/DailyForm.js';
import AuditLog from '../models/AuditLog.js';
import Product from "../models/Product.js";

const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

const computeDerived = (form) => {
  // supplier bonus
  form.supplierEntries = (form.supplierEntries || []).map((s) => {
    const ordered = Number(s.orderedQty || 0);
    const actual = Number(s.actualQty || 0);
    return { ...s, bonusQty: actual - ordered };
  });

  // item totals
  form.items = (form.items || []).map((it) => {
    const opening = Number(it.openingStock || 0);
    const stockIn = Number(it.newStockIn || 0);
    const spoiled = Number(it.spoiledDisposed || 0);
    const sold = Number(it.qtySold || 0);

    const totalAvailable = Math.max(0, opening + stockIn - spoiled);
    const closingStock = Math.max(0, totalAvailable - sold);

    return {
      ...it,
      totalAvailable,
      closingStock,
      salesCash: Number(it.salesCash || 0),
      salesBank: Number(it.salesBank || 0),
      salesDebt: Number(it.salesDebt || 0),
      deviation: Number(it.deviation || 0),
    };
  });

  // cash summary from item rows + expenses
  const totalCashIn = form.items.reduce((sum, it) => sum + Number(it.salesCash || 0), 0);
  const totalBankIn = form.items.reduce((sum, it) => sum + Number(it.salesBank || 0), 0);
  const totalDebt = form.items.reduce((sum, it) => sum + Number(it.salesDebt || 0), 0);

  const totalExpenses = (form.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const expectedCashAtHand = totalCashIn - totalExpenses;
  const actualCashCounted = Number(form.cashSummary?.actualCashCounted || 0);
  const cashDifference = actualCashCounted - expectedCashAtHand;

  form.cashSummary = {
    ...form.cashSummary,
    totalCashIn,
    totalBankIn,
    totalDebt,
    totalExpenses,
    expectedCashAtHand,
    actualCashCounted,
    cashDifference,
    differenceExplanation: form.cashSummary?.differenceExplanation || '',
  };

  return form;
};

const validateSubmit = (form) => {
  // must have supplier entries
  if (!form.supplierEntries || form.supplierEntries.length === 0) return 'Add at least one supplier entry.';

  for (let i = 0; i < form.supplierEntries.length; i++) {
    const s = form.supplierEntries[i];
    if (!String(s.supplierName || '').trim()) return `Supplier row ${i + 1}: Supplier Name is required.`;
    if (Number(s.orderedQty) <= 0) return `Supplier row ${i + 1}: Ordered Qty must be > 0.`;
    if (Number(s.actualQty) <= 0) return `Supplier row ${i + 1}: Actual Qty must be > 0.`;
  }

  // must have at least one item row
  if (!form.items || form.items.length === 0) return 'Add at least one item row in the stock table.';

  // validate item rows
  for (let i = 0; i < form.items.length; i++) {
    const it = form.items[i];
    if (!String(it.itemCode || '').trim()) return `Item row ${i + 1}: Item Code is required.`;
    if (!String(it.itemName || '').trim()) return `Item row ${i + 1}: Item Name is required.`;

    const available = Number(it.totalAvailable || 0);
    const sold = Number(it.qtySold || 0);
    if (sold > available) return `Item ${it.itemCode}: Qty sold exceeds available stock.`;
  }

  // cash difference explanation required
  if (Number(form.cashSummary?.cashDifference || 0) !== 0) {
    if (!String(form.cashSummary?.differenceExplanation || '').trim()) {
      return 'Cash difference is not zero. Provide explanation.';
    }
  }

  return null;
};

// POST /api/daily-forms/draft
// POST /api/daily-forms/draft  (STRICT: get only)
export const getDraft = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { date, shift = "Morning" } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, message: "Missing businessId for user" });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const formDate = normalizeDate(date);

    const form = await DailyForm.findOne({ businessId, date: formDate, shift });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Daily form not created yet. Owner/Manager must create it from Products.",
      });
    }

    computeDerived(form);
    await form.save();

    return res.status(200).json({ success: true, form });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// PUT /api/daily-forms/:id
export const updateDraft = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;
    const role = req.user.role;
    
    const form = await DailyForm.findOne({ _id: id, businessId });
    if (!form) return res.status(404).json({ success: false, message: 'Daily form not found' });

    if (form.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Cannot edit a submitted/locked form' });
    }

    const up = req.body;

    // Everyone can fill header values if you want
    if (up.kplcMeterOpening !== undefined) form.kplcMeterOpening = up.kplcMeterOpening;
    if (up.kplcMeterClosing !== undefined) form.kplcMeterClosing = up.kplcMeterClosing;
    if (up.cashSummary) form.cashSummary = { ...(form.cashSummary || {}), ...up.cashSummary };
    if (up.notes !== undefined) form.notes = up.notes;

    if (role === "cashier") {
      const up = req.body;

      // supplier table editable
      if (Array.isArray(up.supplierEntries)) form.supplierEntries = up.supplierEntries;

      // item value columns editable but structure locked
      const incomingItems = Array.isArray(up.items) ? up.items : [];
      const patchByCode = new Map(incomingItems.map((x) => [x.itemCode, x]));

      form.items = form.items.map((existing) => {
        const patch = patchByCode.get(existing.itemCode) || {};
        return {
          ...existing.toObject(),
          itemCode: existing.itemCode,
          itemName: existing.itemName,

          openingStock: patch.openingStock ?? existing.openingStock,
          newStockIn: patch.newStockIn ?? existing.newStockIn,
          spoiledDisposed: patch.spoiledDisposed ?? existing.spoiledDisposed,
          qtySold: patch.qtySold ?? existing.qtySold,
          salesCash: patch.salesCash ?? existing.salesCash,
          salesBank: patch.salesBank ?? existing.salesBank,
          salesDebt: patch.salesDebt ?? existing.salesDebt,
          deviation: patch.deviation ?? existing.deviation,
        };
      });

      // allow meter readings + notes
      if (up.kplcMeterOpening !== undefined) form.kplcMeterOpening = up.kplcMeterOpening;
      if (up.kplcMeterClosing !== undefined) form.kplcMeterClosing = up.kplcMeterClosing;
      if (up.notes !== undefined) form.notes = up.notes;

      // allow cash count inputs (but cannot submit)
      if (up.cashSummary) form.cashSummary = { ...(form.cashSummary || {}), ...up.cashSummary };
    }

    computeDerived(form);
    await form.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: 'update',
      recordType: 'DailyForm',
      recordId: form._id.toString(),
      description: `Updated daily form draft`,
    });

    return res.status(200).json({ success: true, form });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// POST /api/daily-forms/:id/submit
export const submitForm = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only owner/manager can submit daily forms' });
    }

    const form = await DailyForm.findOne({ _id: id, businessId });
    if (!form) return res.status(404).json({ success: false, message: 'Daily form not found' });

    if (form.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Form already submitted/locked' });
    }

    // Apply final fields (like actual cash counted and explanation)
    if (req.body.cashSummary) {
      form.cashSummary = { ...(form.cashSummary || {}), ...(req.body.cashSummary || {}) };
    }
    if (req.body.notes !== undefined) form.notes = req.body.notes;

    computeDerived(form);

    const validationError = validateSubmit(form);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    form.status = 'submitted';
    form.approvedBy = req.userId;

    await form.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: 'update',
      recordType: 'DailyForm',
      recordId: form._id.toString(),
      description: `Submitted daily form`,
    });

    return res.status(200).json({ success: true, message: 'Daily form submitted', form });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/daily-forms
export const listForms = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const q = { businessId };

    if (startDate && endDate) {
      q.date = { $gte: normalizeDate(startDate), $lte: normalizeDate(endDate) };
    }

    const forms = await DailyForm.find(q)
      .sort({ date: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await DailyForm.countDocuments(q);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      forms,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/daily-forms/:id
export const getFormById = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const form = await DailyForm.findOne({ _id: id, businessId })
      .populate('recordedBy', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName email role');

    if (!form) return res.status(404).json({ success: false, message: 'Daily form not found' });

    return res.status(200).json({ success: true, form });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE /api/daily-forms/:id
export const deleteForm = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owner can delete daily forms' });
    }

    const form = await DailyForm.findOne({ _id: id, businessId });
    if (!form) return res.status(404).json({ success: false, message: 'Daily form not found' });

    await DailyForm.findByIdAndDelete(id);

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: 'delete',
      recordType: 'DailyForm',
      recordId: id,
      description: `Deleted daily form`,
    });

    return res.status(200).json({ success: true, message: 'Daily form deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// POST /api/daily-forms/create
export const createDailyForm = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { date, shift = "Morning", productIds = [] } = req.body;

    if (!businessId) return res.status(400).json({ success: false, message: "Missing businessId for user" });
    if (!date) return res.status(400).json({ success: false, message: "Date is required" });

    const formDate = normalizeDate(date);

    const exists = await DailyForm.findOne({ businessId, date: formDate, shift });
    if (exists) {
      return res.status(400).json({ success: false, message: "Daily form already exists for this date/shift" });
    }

    const productFilter = { businessId, isActive: true };
    if (Array.isArray(productIds) && productIds.length > 0) {
      productFilter._id = { $in: productIds };
    }

    const products = await Product.find(productFilter).sort({ createdAt: -1 });

    if (!products.length) {
      return res.status(400).json({ success: false, message: "No active products found to create the form." });
    }

    const items = products.map((p) => ({
      itemCode: p.itemCode,
      itemName: p.name,
      openingStock: 0,
      newStockIn: 0,
      spoiledDisposed: 0,
      qtySold: 0,
      salesCash: 0,
      salesBank: 0,
      salesDebt: 0,
      deviation: 0,
    }));

    const form = await DailyForm.create({
      businessId,
      date: formDate,
      shift,
      status: "draft",
      recordedBy: req.userId,
      supplierEntries: [],
      items,
      expenses: [],
      cashSummary: {},
      notes: "",
    });

    computeDerived(form);
    await form.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: "create",
      recordType: "DailyForm",
      recordId: form._id.toString(),
      description: `Created daily form from products for ${formDate.toISOString().split("T")[0]} (${shift})`,
    });

    return res.status(201).json({ success: true, form });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Form already exists for this date/shift" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
