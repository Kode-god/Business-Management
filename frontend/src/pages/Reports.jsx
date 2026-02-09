import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, FileText, CalendarRange, Boxes } from "lucide-react";

export default function Reports() {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toLowerCase();

  const managerOnly = role === "owner" || role === "manager";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-600">Weekly + Monthly summaries (Monday → Sunday)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={() => navigate("/reports/weekly-sales")}
            className={`bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer ${!managerOnly ? "opacity-60" : ""}`}
            title={!managerOnly ? "Owner/Manager only" : ""}
          >
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Weekly Sales</h2>
            </div>
            <p className="text-gray-600">Totals (cash/bank/debt) and daily breakdown for the selected week.</p>
          </div>

          <div
            onClick={() => navigate("/reports/weekly-expenses")}
            className={`bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer ${!managerOnly ? "opacity-60" : ""}`}
            title={!managerOnly ? "Owner/Manager only" : ""}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Weekly Expenses</h2>
            </div>
            <p className="text-gray-600">Total expenses and breakdown by category for the selected week.</p>
          </div>

          <div
            onClick={() => navigate("/reports/stock-balance")}
            className={`bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer ${!managerOnly ? "opacity-60" : ""}`}
            title={!managerOnly ? "Owner/Manager only" : ""}
          >
            <div className="flex items-center gap-3 mb-2">
              <Boxes className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Stock Balance</h2>
            </div>
            <p className="text-gray-600">Item stock movement summary for a chosen date range.</p>
          </div>

          <div
            onClick={() => navigate("/reports/monthly-summary")}
            className={`bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer ${!managerOnly ? "opacity-60" : ""}`}
            title={!managerOnly ? "Owner/Manager only" : ""}
          >
            <div className="flex items-center gap-3 mb-2">
              <CalendarRange className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Monthly Summary</h2>
            </div>
            <p className="text-gray-600">Monthly totals: sales, expenses, cash differences, suppliers, and stock.</p>
          </div>
        </div>

        {!managerOnly && (
          <p className="mt-6 text-sm text-gray-600">
            Note: Weekly/Monthly reports are currently restricted to Owner/Manager (backend authorization).
          </p>
        )}
      </main>
    </div>
  );
}
