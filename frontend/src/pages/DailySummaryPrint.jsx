import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function DailySummaryPrint() {
  const { formId } = useParams();
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("token"), []);
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/reports/daily-summary/${formId}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || data?.error || "Failed to load report");
        setForm(data.form);
      } catch (e) {
        setError(e.message);
      }
    };
    load();
  }, [formId, headers]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!form) return <div className="p-6">Loading...</div>;

  const dateStr = new Date(form.date).toISOString().slice(0, 10);

  const supplierTotals = (form.supplierEntries || []).reduce((acc, s) => {
    acc.ordered += Number(s.orderedQty || 0);
    acc.actual += Number(s.actualQty || 0);
    acc.bonus += Number(s.bonusQty || 0);
    acc.afterBoiling += Number(s.qtyAfterBoiling || 0);
    return acc;
  }, { ordered: 0, actual: 0, bonus: 0, afterBoiling: 0 });

  const salesTotals = (form.items || []).reduce((acc, it) => {
    acc.cash += Number(it.salesCash || 0);
    acc.bank += Number(it.salesBank || 0);
    acc.debt += Number(it.salesDebt || 0);
    return acc;
  }, { cash: 0, bank: 0, debt: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="print-page max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Summary Report</h1>
              <p className="text-sm text-gray-600">Date: {dateStr} • Shift: {form.shift}</p>
              <p className="text-sm text-gray-600">Status: {String(form.status).toUpperCase()}</p>
            </div>
            <div className="text-right text-sm text-gray-700">
              <p><span className="font-semibold">Recorded by:</span> {form.recordedBy?.firstName} {form.recordedBy?.lastName}</p>
              <p><span className="font-semibold">Approved by:</span> {form.approvedBy ? `${form.approvedBy.firstName} ${form.approvedBy.lastName}` : "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="font-semibold">KPLC Opening</p>
              <p>{Number(form.kplcMeterOpening || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="font-semibold">KPLC Closing</p>
              <p>{Number(form.kplcMeterClosing || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Suppliers */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Supplier Deliveries</h2>
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border text-left">Supplier</th>
                <th className="p-2 border">Ordered</th>
                <th className="p-2 border">Actual</th>
                <th className="p-2 border">Bonus</th>
                <th className="p-2 border">After Boiling</th>
              </tr>
            </thead>
            <tbody>
              {(form.supplierEntries || []).map((s, i) => (
                <tr key={i}>
                  <td className="p-2 border text-center">{i + 1}</td>
                  <td className="p-2 border">{s.supplierName}</td>
                  <td className="p-2 border text-right">{Number(s.orderedQty || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(s.actualQty || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(s.bonusQty || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(s.qtyAfterBoiling || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-semibold bg-gray-50">
                <td className="p-2 border" colSpan={2}>Totals</td>
                <td className="p-2 border text-right">{supplierTotals.ordered.toFixed(2)}</td>
                <td className="p-2 border text-right">{supplierTotals.actual.toFixed(2)}</td>
                <td className="p-2 border text-right">{supplierTotals.bonus.toFixed(2)}</td>
                <td className="p-2 border text-right">{supplierTotals.afterBoiling.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Stock & Sales */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Stock & Sales</h2>
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border text-left">Item</th>
                <th className="p-2 border">Opening</th>
                <th className="p-2 border">In</th>
                <th className="p-2 border">Spoilt</th>
                <th className="p-2 border">Available</th>
                <th className="p-2 border">Sold</th>
                <th className="p-2 border">Cash</th>
                <th className="p-2 border">Bank</th>
                <th className="p-2 border">Debt</th>
                <th className="p-2 border">Closing</th>
              </tr>
            </thead>
            <tbody>
              {(form.items || []).map((it, i) => (
                <tr key={i}>
                  <td className="p-2 border">{it.itemCode} - {it.itemName}</td>
                  <td className="p-2 border text-right">{Number(it.openingStock || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.newStockIn || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.spoiledDisposed || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.totalAvailable || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.qtySold || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.salesCash || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.salesBank || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.salesDebt || 0).toFixed(2)}</td>
                  <td className="p-2 border text-right">{Number(it.closingStock || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-semibold bg-gray-50">
                <td className="p-2 border" colSpan={6}>Sales Totals</td>
                <td className="p-2 border text-right">{salesTotals.cash.toFixed(2)}</td>
                <td className="p-2 border text-right">{salesTotals.bank.toFixed(2)}</td>
                <td className="p-2 border text-right">{salesTotals.debt.toFixed(2)}</td>
                <td className="p-2 border text-right">{(salesTotals.cash + salesTotals.bank + salesTotals.debt).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash summary */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Cash Reconciliation</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-semibold">Total Cash In:</span> {Number(form.cashSummary?.totalCashIn || 0).toFixed(2)}</div>
            <div><span className="font-semibold">Total Bank In:</span> {Number(form.cashSummary?.totalBankIn || 0).toFixed(2)}</div>
            <div><span className="font-semibold">Total Debt:</span> {Number(form.cashSummary?.totalDebt || 0).toFixed(2)}</div>
            <div><span className="font-semibold">Total Expenses:</span> {Number(form.cashSummary?.totalExpenses || 0).toFixed(2)}</div>
            <div><span className="font-semibold">Expected Cash:</span> {Number(form.cashSummary?.expectedCashAtHand || 0).toFixed(2)}</div>
            <div><span className="font-semibold">Actual Cash:</span> {Number(form.cashSummary?.actualCashCounted || 0).toFixed(2)}</div>
            <div className="col-span-2">
              <span className="font-semibold">Difference:</span> {Number(form.cashSummary?.cashDifference || 0).toFixed(2)}
              {Number(form.cashSummary?.cashDifference || 0) !== 0 && (
                <div className="mt-1">
                  <span className="font-semibold">Explanation:</span> {form.cashSummary?.differenceExplanation || "—"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.notes || "—"}</p>
        </div>
      </div>
    </div>
  );
}
