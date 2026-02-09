import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const toYMD = (d = new Date()) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function WeeklySalesReport() {
  const navigate = useNavigate();

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const [date, setDate] = useState(toYMD());
  const [shift, setShift] = useState("All");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setData(null);
    try {
      const qs = new URLSearchParams({ date, shift });
      const res = await fetch(`${API_URL}/api/reports/weekly-sales?${qs.toString()}`, { headers });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || "Failed to load weekly sales");
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = data?.totals || { cash: 0, bank: 0, debt: 0, totalSoldQty: 0, totalSales: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/reports")} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Sales Report</h1>
          <p className="text-sm text-gray-600">Week runs Monday → Sunday</p>

          <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="text-xs font-semibold text-gray-700">Any date in week</label>
              <input value={date} onChange={(e) => setDate(e.target.value)} type="date"
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
                <span className="font-semibold">Range:</span>{" "}
                {new Date(data.range.start).toISOString().slice(0, 10)} — {new Date(data.range.end).toISOString().slice(0, 10)}
                {" "}• <span className="font-semibold">Shift:</span> {data.shift}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Cash</div>
                  <div className="text-lg font-bold">{Number(totals.cash || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Bank</div>
                  <div className="text-lg font-bold">{Number(totals.bank || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Debt</div>
                  <div className="text-lg font-bold">{Number(totals.debt || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold">Qty Sold</div>
                  <div className="text-lg font-bold">{Number(totals.totalSoldQty || 0).toFixed(2)}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-700 font-semibold">Total Sales</div>
                  <div className="text-lg font-extrabold text-blue-900">{Number(totals.totalSales || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">Daily Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-left">Date</th>
                      <th className="p-2 border text-left">Shift</th>
                      <th className="p-2 border text-right">Cash</th>
                      <th className="p-2 border text-right">Bank</th>
                      <th className="p-2 border text-right">Debt</th>
                      <th className="p-2 border text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.daily || []).map((r, i) => {
                      const day = new Date(r._id.date).toISOString().slice(0, 10);
                      const cash = Number(r.cash || 0);
                      const bank = Number(r.bank || 0);
                      const debt = Number(r.debt || 0);
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-2 border">{day}</td>
                          <td className="p-2 border">{r._id.shift}</td>
                          <td className="p-2 border text-right">{cash.toFixed(2)}</td>
                          <td className="p-2 border text-right">{bank.toFixed(2)}</td>
                          <td className="p-2 border text-right">{debt.toFixed(2)}</td>
                          <td className="p-2 border text-right">{(cash + bank + debt).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {(data.daily || []).length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-gray-600" colSpan={6}>No submitted forms in this week.</td>
                      </tr>
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
