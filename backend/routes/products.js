import express from "express";
import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deactivateProduct,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Everyone logged in can view products (so cashier can use them in daily forms)
router.get("/", protect, listProducts);
router.get("/:id", protect, getProductById);

// Only owner/manager can modify products
router.post("/", protect, authorize("owner", "manager"), createProduct);
router.put("/:id", protect, authorize("owner", "manager"), updateProduct);
router.delete("/:id", protect, authorize("owner", "manager"), deactivateProduct);

export default router;
