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

export default function StockBalanceReport() {
  const navigate = useNavigate();

  const headers = useMemo(() => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const [startDate, setStartDate] = useState(toYMD(new Date(Date.now() - 6 * 24 * 3600 * 1000)));
  const [endDate, setEndDate] = useState(toYMD());
  const [shift, setShift] = useState("All");

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setData(null);
    try {
      const qs = new URLSearchParams({ startDate, endDate, shift });
      const res = await fetch(`${API_URL}/api/reports/stock-balance?${qs.toString()}`, { headers });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || "Failed to load stock balance");
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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
          <h1 className="text-2xl font-bold text-gray-900">Stock Balance Report</h1>

          <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div>
              <label className="text-xs font-semibold text-gray-700">Start date</label>
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">End date</label>
              <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date"
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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Range:</span>{" "}
                {new Date(data.range.start).toISOString().slice(0, 10)} — {new Date(data.range.end).toISOString().slice(0, 10)}
                {" "}• <span className="font-semibold">Shift:</span> {data.shift}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border text-left">Item Code</th>
                    <th className="p-2 border text-left">Item Name</th>
                    <th className="p-2 border text-right">Opening Total</th>
                    <th className="p-2 border text-right">In Total</th>
                    <th className="p-2 border text-right">Spoilt Total</th>
                    <th className="p-2 border text-right">Sold Total</th>
                    <th className="p-2 border text-right">Avg Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.perItem || []).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 border">{r.itemCode}</td>
                      <td className="p-2 border">{r.itemName}</td>
                      <td className="p-2 border text-right">{Number(r.totalOpening || 0).toFixed(2)}</td>
                      <td className="p-2 border text-right">{Number(r.totalIn || 0).toFixed(2)}</td>
                      <td className="p-2 border text-right">{Number(r.totalSpoilt || 0).toFixed(2)}</td>
                      <td className="p-2 border text-right">{Number(r.totalSold || 0).toFixed(2)}</td>
                      <td className="p-2 border text-right">{Number(r.avgClosing || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {(data.perItem || []).length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-gray-600" colSpan={7}>No submitted forms in this range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
