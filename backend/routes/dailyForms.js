// routes/dailyForms.js
import express from "express";
import {
  createDailyForm,
  getDraft,
  updateDraft,
  submitForm,
  listForms,
  getFormById,
  deleteForm,
} from "../controllers/dailyFormController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Create daily form structure from Products (Owner/Manager)
router.post("/create", protect, authorize("owner", "manager"), createDailyForm);

// Draft lifecycle
router.post("/draft", protect, getDraft);
router.put("/:id", protect, updateDraft);
router.post("/:id/submit", protect, authorize("owner", "manager"), submitForm);

// Read
router.get("/", protect, listForms);
router.get("/:id", protect, getFormById);

// Delete
router.delete("/:id", protect, authorize("owner"), deleteForm);

export default router;
