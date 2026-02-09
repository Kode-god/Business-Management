import Transaction from '../models/Transaction.js';
import AuditLog from '../models/AuditLog.js';

export const recordTransaction = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { date, type, productId, quantity, unitPrice, paymentMethod, description, supplierId, expenseCategory } = req.body;

    const totalAmount = quantity * unitPrice;

    const transaction = new Transaction({
      businessId,
      date,
      type,
      productId: productId || null,
      quantity,
      unitPrice,
      totalAmount,
      paymentMethod,
      description,
      supplierId: supplierId || null,
      expenseCategory: expenseCategory || null,
      recordedBy: req.user.id
    });

    await transaction.save();

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'create',
      recordType: 'Transaction',
      recordId: transaction._id.toString(),
      description: `Recorded ${type} transaction of ${quantity} units`
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { type, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { businessId };

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Transaction.find(query)
      .populate('productId', 'name')
      .populate('supplierId', 'name')
      .populate('recordedBy', 'firstName lastName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pages: Math.ceil(total / limit),
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getTransaction = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ _id: transactionId, businessId })
      .populate('productId', 'name')
      .populate('supplierId', 'name')
      .populate('recordedBy', 'firstName lastName');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { transactionId } = req.params;
    const { quantity, unitPrice, paymentMethod, description } = req.body;

    const transaction = await Transaction.findOne({ _id: transactionId, businessId });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const oldData = { ...transaction.toObject() };

    transaction.quantity = quantity || transaction.quantity;
    transaction.unitPrice = unitPrice || transaction.unitPrice;
    transaction.totalAmount = transaction.quantity * transaction.unitPrice;
    transaction.paymentMethod = paymentMethod || transaction.paymentMethod;
    transaction.description = description || transaction.description;

    await transaction.save();

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'update',
      recordType: 'Transaction',
      recordId: transactionId,
      changes: { before: oldData, after: transaction.toObject() },
      description: `Updated transaction`
    });

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { transactionId } = req.params;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can delete transactions' });
    }

    const transaction = await Transaction.findOne({ _id: transactionId, businessId });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await Transaction.findByIdAndDelete(transactionId);

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'delete',
      recordType: 'Transaction',
      recordId: transactionId,
      description: `Deleted transaction`
    });

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
