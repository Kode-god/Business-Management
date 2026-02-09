import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const toYYYYMM = (d = new Date()) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

export default function MonthlySummaryReport() {
  const navigate = useNavigate();

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const [month, setMonth] = useState(toYYYYMM());
  const [shift, setShift] = useState("All");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setData(null);
    try {
      const qs = new URLSearchParams({ month, shift });
      const res = await fetch(`${API_URL}/api/reports/monthly-summary?${qs.toString()}`, { headers });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || "Failed to load monthly summary");
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const totals = data?.totals || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/reports")} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h1 className="text-2xl font-bold text-gray-900">Monthly Summary Report</h1>

          <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="text-xs font-semibold text-gray-700">Month</label>
              <input value={month} onChange={(e) => setMonth(e.target.value)} type="month"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Shift</label>
              <select value={shift} onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="All">All</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={load}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border hover:bg-gray-50 font-semibold">
                <RefreshCw className="w-4 h-4" /> Load
              </button>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        {data && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Month:</span> {data.month} •{" "}
                <span className="font-semibold">Shift:</span> {data.shift}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Days Submitted</div>
                  <div className="text-lg font-bold">{Number(totals.daysSubmitted || 0)}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-700 font-semibold">Total Sales</div>
                  <div className="text-lg font-extrabold text-blue-900">{Number(totals.totalSales || 0).toFixed(2)}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-xs text-red-700 font-semibold">Total Expenses</div>
                  <div className="text-lg font-extrabold text-red-800">{Number(totals.totalExpenses || 0).toFixed(2)}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs text-yellow-700 font-semibold">Total Cash Difference</div>
                  <div className="text-lg font-extrabold text-yellow-800">{Number(totals.totalCashDifference || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Expenses by category */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Expenses by Category</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-left">Category</th>
                      <th className="p-2 border text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.expenseByCategory || []).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 border">{r._id}</td>
                        <td className="p-2 border text-right">{Number(r.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {(data.expenseByCategory || []).length === 0 && (
                      <tr><td className="p-4 text-center text-gray-600" colSpan={2}>No expenses found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suppliers */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-lg font-bold text-gray-900">Supplier Totals</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Ordered</div>
                  <div className="text-lg font-bold">{Number(data.supplierTotals?.ordered || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Actual</div>
                  <div className="text-lg font-bold">{Number(data.supplierTotals?.actual || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Bonus</div>
                  <div className="text-lg font-bold">{Number(data.supplierTotals?.bonus || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">After Boiling</div>
                  <div className="text-lg font-bold">{Number(data.supplierTotals?.afterBoiling || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Stock per item */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Stock Movement (Monthly)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-left">Item</th>
                      <th className="p-2 border text-right">Opening</th>
                      <th className="p-2 border text-right">In</th>
                      <th className="p-2 border text-right">Spoilt</th>
                      <th className="p-2 border text-right">Sold</th>
                      <th className="p-2 border text-right">Avg Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.stockPerItem || []).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 border">{r.itemCode} - {r.itemName}</td>
                        <td className="p-2 border text-right">{Number(r.opening || 0).toFixed(2)}</td>
                        <td className="p-2 border text-right">{Number(r.in || 0).toFixed(2)}</td>
                        <td className="p-2 border text-right">{Number(r.spoilt || 0).toFixed(2)}</td>
                        <td className="p-2 border text-right">{Number(r.sold || 0).toFixed(2)}</td>
                        <td className="p-2 border text-right">{Number(r.avgClosing || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {(data.stockPerItem || []).length === 0 && (
                      <tr><td className="p-4 text-center text-gray-600" colSpan={6}>No stock records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
