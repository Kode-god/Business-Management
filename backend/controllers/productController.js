import Product from "../models/Product.js";
import AuditLog from "../models/AuditLog.js";

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { itemCode, name, unit, category, sellingPrice, costPrice, reorderLevel } = req.body;

    if (!businessId) return res.status(400).json({ success: false, message: "Missing businessId for user" });
    if (!itemCode || !name) return res.status(400).json({ success: false, message: "itemCode and name are required" });

    const product = await Product.create({
      businessId,
      itemCode: String(itemCode).trim(),
      name: String(name).trim(),
      unit: unit || "pcs",
      category: category || "general",
      sellingPrice: Number(sellingPrice || 0),
      costPrice: Number(costPrice || 0),
      reorderLevel: Number(reorderLevel || 0),
      createdBy: req.userId,
      updatedBy: req.userId,
    });

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: "create",
      recordType: "Product",
      recordId: product._id.toString(),
      description: `Created product ${product.itemCode} - ${product.name}`,
    });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    // duplicate key (itemCode already used in this business)
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Item code already exists in this business" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { q = "", active = "true" } = req.query;

    const filter = { businessId };

    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    if (q) {
      filter.$or = [
        { itemCode: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, businessId });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    return res.status(200).json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, businessId });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const oldData = product.toObject();

    const up = req.body;
    if (up.itemCode !== undefined) product.itemCode = String(up.itemCode).trim();
    if (up.name !== undefined) product.name = String(up.name).trim();
    if (up.unit !== undefined) product.unit = String(up.unit).trim();
    if (up.category !== undefined) product.category = String(up.category).trim();
    if (up.sellingPrice !== undefined) product.sellingPrice = Number(up.sellingPrice || 0);
    if (up.costPrice !== undefined) product.costPrice = Number(up.costPrice || 0);
    if (up.reorderLevel !== undefined) product.reorderLevel = Number(up.reorderLevel || 0);
    if (up.isActive !== undefined) product.isActive = Boolean(up.isActive);

    product.updatedBy = req.userId;

    await product.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: "update",
      recordType: "Product",
      recordId: product._id.toString(),
      changes: { before: oldData, after: product.toObject() },
      description: `Updated product ${product.itemCode} - ${product.name}`,
    });

    return res.status(200).json({ success: true, product });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Item code already exists in this business" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// DELETE /api/products/:id (soft delete => deactivate)
export const deactivateProduct = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, businessId });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.isActive = false;
    product.updatedBy = req.userId;
    await product.save();

    await AuditLog.create({
      businessId,
      userId: req.userId,
      actionType: "update",
      recordType: "Product",
      recordId: product._id.toString(),
      description: `Deactivated product ${product.itemCode} - ${product.name}`,
    });

    return res.status(200).json({ success: true, message: "Product deactivated", product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
