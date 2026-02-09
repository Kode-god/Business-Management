// controllers/dashboardController.js
import DailyForm from "../models/DailyForm.js";
import Product from "../models/Product.js";
import { User } from "../models/User.js";

const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

export const getDashboardSummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({ success: false, message: "Missing businessId for user" });
    }

    const now = new Date();
    const from = startOfMonth(now);
    const to = endOfMonth(now);

    const [
      dailyFormsThisMonth,
      submittedThisMonth,
      activeProducts,
      usersCount,
      latestForm,
    ] = await Promise.all([
      DailyForm.countDocuments({ businessId, date: { $gte: from, $lt: to } }),
      DailyForm.countDocuments({ businessId, status: "submitted", date: { $gte: from, $lt: to } }),
      Product.countDocuments({ businessId, isActive: true }),
      User.countDocuments({ businessId, isActive: true }),
      DailyForm.findOne({ businessId }).sort({ date: -1 }).select("date shift status"),
    ]);

    return res.json({
      success: true,
      summary: {
        dailyFormsThisMonth,
        submittedThisMonth,
        activeProducts,
        usersCount,
        accountStatus: "Active",
        latestForm: latestForm
          ? {
              date: latestForm.date,
              shift: latestForm.shift,
              status: latestForm.status,
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
