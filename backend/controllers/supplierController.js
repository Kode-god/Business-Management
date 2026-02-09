import Supplier from '../models/Supplier.js';
import AuditLog from '../models/AuditLog.js';

export const createSupplier = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { name, contactPerson, phone, email, location, deliveryFrequency, productIds } = req.body;

    const existingSupplier = await Supplier.findOne({ businessId, name });
    if (existingSupplier) {
      return res.status(400).json({ success: false, message: 'Supplier already exists' });
    }

    const supplier = new Supplier({
      businessId,
      name,
      contactPerson,
      phone,
      email,
      location,
      deliveryFrequency,
      productIds: productIds || []
    });

    await supplier.save();

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'create',
      recordType: 'Supplier',
      recordId: supplier._id.toString(),
      description: `Created supplier: ${name}`
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      supplier
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { page = 1, limit = 20 } = req.query;

    const suppliers = await Supplier.find({ businessId, isActive: true })
      .populate('productIds', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const total = await Supplier.countDocuments({ businessId, isActive: true });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      total,
      pages: Math.ceil(total / limit),
      suppliers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getSupplier = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({ _id: supplierId, businessId }).populate('productIds', 'name');

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.status(200).json({
      success: true,
      supplier
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { supplierId } = req.params;
    const { name, contactPerson, phone, email, location, deliveryFrequency, productIds } = req.body;

    const supplier = await Supplier.findOne({ _id: supplierId, businessId });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const oldData = { ...supplier.toObject() };

    supplier.name = name || supplier.name;
    supplier.contactPerson = contactPerson || supplier.contactPerson;
    supplier.phone = phone || supplier.phone;
    supplier.email = email || supplier.email;
    supplier.location = location || supplier.location;
    supplier.deliveryFrequency = deliveryFrequency || supplier.deliveryFrequency;
    if (productIds) {
      supplier.productIds = productIds;
    }

    await supplier.save();

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'update',
      recordType: 'Supplier',
      recordId: supplierId,
      changes: { before: oldData, after: supplier.toObject() },
      description: `Updated supplier: ${supplier.name}`
    });

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      supplier: await supplier.populate('productIds', 'name')
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { supplierId } = req.params;

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can delete suppliers' });
    }

    const supplier = await Supplier.findOne({ _id: supplierId, businessId });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    supplier.isActive = false;
    await supplier.save();

    await AuditLog.create({
      businessId,
      userId: req.user.id,
      actionType: 'delete',
      recordType: 'Supplier',
      recordId: supplierId,
      description: `Deleted supplier: ${supplier.name}`
    });

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
