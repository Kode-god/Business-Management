import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Plus,
  Save,
  Lock,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const safeJson = (v, fallback) => {
  if (!v || v === "undefined" || v === "null") return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

const toYMD = (d = new Date()) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const DailyForms = () => {
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("token"), []);
  const role = useMemo(
    () => (localStorage.getItem("role") || "cashier").toLowerCase(),
    []
  );
  const user = useMemo(() => safeJson(localStorage.getItem("user"), null), []);
  const business = useMemo(
    () => safeJson(localStorage.getItem("business"), null),
    []
  );

  const isManagerOrOwner = role === "owner" || role === "manager";
  const isCashier = role === "cashier";

  // Strict permissions
  const canEditStructure = isManagerOrOwner; // can create (choose products)
  const canEditValues = isManagerOrOwner || isCashier; // cashier can edit values
  const canSubmit = isManagerOrOwner;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // Core form state
  const [formId, setFormId] = useState(null);
  const [status, setStatus] = useState("draft"); // draft | submitted | locked
  const locked = status !== "draft";

  // Exists strictly means: form exists in backend for this date/shift
  const [exists, setExists] = useState(false);

  // Header fields
  const [date, setDate] = useState(toYMD());
  const [shift, setShift] = useState("Morning");
  const [kplcOpening, setKplcOpening] = useState("");
  const [kplcClosing, setKplcClosing] = useState("");

  // Two tables
  const [supplierEntries, setSupplierEntries] = useState([]);
  const [items, setItems] = useState([]);

  // Expenses
  const [expenses, setExpenses] = useState([]);

  // Cash summary inputs (cashier can fill too)
  const [actualCashCounted, setActualCashCounted] = useState("");
  const [differenceExplanation, setDifferenceExplanation] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Products picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // ---- Derived calcs (frontend mirror) ----
  const computedSupplierEntries = useMemo(
    () =>
      supplierEntries.map((s) => {
        const ordered = normalizeNum(s.orderedQty);
        const actual = normalizeNum(s.actualQty);
        return { ...s, bonusQty: actual - ordered };
      }),
    [supplierEntries]
  );

  const computedItems = useMemo(
    () =>
      items.map((it) => {
        const opening = normalizeNum(it.openingStock);
        const stockIn = normalizeNum(it.newStockIn);
        const spoiled = normalizeNum(it.spoiledDisposed);
        const sold = normalizeNum(it.qtySold);

        const totalAvailable = Math.max(0, opening + stockIn - spoiled);
        const closingStock = Math.max(0, totalAvailable - sold);

        return {
          ...it,
          totalAvailable,
          closingStock,
          salesCash: normalizeNum(it.salesCash),
          salesBank: normalizeNum(it.salesBank),
          salesDebt: normalizeNum(it.salesDebt),
        };
      }),
    [items]
  );

  const cashSummary = useMemo(() => {
    const totalCashIn = computedItems.reduce(
      (sum, it) => sum + normalizeNum(it.salesCash),
      0
    );
    const totalBankIn = computedItems.reduce(
      (sum, it) => sum + normalizeNum(it.salesBank),
      0
    );
    const totalDebt = computedItems.reduce(
      (sum, it) => sum + normalizeNum(it.salesDebt),
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + normalizeNum(e.amount),
      0
    );

    const expectedCashAtHand = totalCashIn - totalExpenses;
    const actual = normalizeNum(actualCashCounted);
    const diff = actual - expectedCashAtHand;

    return {
      totalCashIn,
      totalBankIn,
      totalDebt,
      totalExpenses,
      expectedCashAtHand,
      actualCashCounted: actual,
      cashDifference: diff,
    };
  }, [computedItems, expenses, actualCashCounted]);

  // ---------------------------
  // API
  // ---------------------------

  // STRICT: load draft ONLY if it exists; backend returns 404 if not created
  const fetchDraftStrict = async () => {
    setLoading(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch(`${API_URL}/api/daily-forms/draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, shift }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404) {
          // Form not created yet
          setExists(false);
          setFormId(null);
          setStatus("draft");
          setSupplierEntries([]);
          setItems([]);
          setExpenses([]);
          setKplcOpening("");
          setKplcClosing("");
          setActualCashCounted("");
          setDifferenceExplanation("");
          setNotes("");
          setError(
            data?.message ||
              "Daily form not created yet. Owner/Manager must create it from Products."
          );
          return;
        }
        throw new Error(data?.message || data?.error || "Failed to load draft");
      }

      const f = data.form;
      setExists(true);
      setFormId(f._id);
      setStatus(f.status || "draft");

      setKplcOpening(f.kplcMeterOpening ?? "");
      setKplcClosing(f.kplcMeterClosing ?? "");

      setSupplierEntries(f.supplierEntries || []);
      setItems(f.items || []);
      setExpenses(f.expenses || []);

      setActualCashCounted(f.cashSummary?.actualCashCounted ?? "");
      setDifferenceExplanation(f.cashSummary?.differenceExplanation ?? "");

      setNotes(f.notes || "");
      setOkMsg("Form loaded.");
    } catch (e) {
      setError(e.message || "Failed to load draft");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/products?active=true`, {
        method: "GET",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to load products");

      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      setError(e.message || "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  // Owner/Manager creates the form structure FROM products
  const createFormFromProducts = async () => {
    if (!canEditStructure) {
      setError("Only owner/manager can create the daily form.");
      return;
    }

    setLoading(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch(`${API_URL}/api/daily-forms/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          date,
          shift,
          productIds: selectedProductIds, // empty => backend uses all active products
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to create form");

      const f = data.form;
      setExists(true);
      setFormId(f._id);
      setStatus(f.status || "draft");

      setSupplierEntries(f.supplierEntries || []);
      setItems(f.items || []);
      setExpenses(f.expenses || []);

      setPickerOpen(false);
      setSelectedProductIds([]);
      setOkMsg("Daily form created from Products. Cashier can now fill values.");
    } catch (e) {
      setError(e.message || "Failed to create form");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!exists || !formId) {
      setError("No form exists for this date/shift. Owner/Manager must create it first.");
      return;
    }
    if (locked) return;

    setLoading(true);
    setError("");
    setOkMsg("");

    try {
      const payload = {
        // header numeric inputs (cashier allowed)
        kplcMeterOpening: normalizeNum(kplcOpening),
        kplcMeterClosing: normalizeNum(kplcClosing),

        supplierEntries: computedSupplierEntries.map((s) => ({
          supplierName: s.supplierName,
          product: s.product || "Milk",
          orderedQty: normalizeNum(s.orderedQty),
          actualQty: normalizeNum(s.actualQty),
          qtyAfterBoiling: normalizeNum(s.qtyAfterBoiling),
        })),

        // Structure locked: we keep itemCode/itemName as-is (backend will enforce too)
        items: computedItems.map((it) => ({
          itemCode: it.itemCode,
          itemName: it.itemName,
          openingStock: normalizeNum(it.openingStock),
          newStockIn: normalizeNum(it.newStockIn),
          spoiledDisposed: normalizeNum(it.spoiledDisposed),
          qtySold: normalizeNum(it.qtySold),
          salesCash: normalizeNum(it.salesCash),
          salesBank: normalizeNum(it.salesBank),
          salesDebt: normalizeNum(it.salesDebt),
          deviation: normalizeNum(it.deviation),
        })),

        expenses: expenses.map((e) => ({
          category: e.category,
          description: e.description || "",
          amount: normalizeNum(e.amount),
          paymentMethod: e.paymentMethod || "cash",
        })),

        cashSummary: {
          actualCashCounted: normalizeNum(actualCashCounted),
          differenceExplanation: differenceExplanation || "",
        },

        notes,
      };

      const res = await fetch(`${API_URL}/api/daily-forms/${formId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to save draft");

      setSupplierEntries(data.form.supplierEntries || []);
      setItems(data.form.items || []);
      setExpenses(data.form.expenses || []);
      setStatus(data.form.status || "draft");
      setOkMsg("Draft saved successfully.");
    } catch (e) {
      setError(e.message || "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const submitForm = async () => {
    if (!canSubmit) {
      setError("Only owner/manager can submit the daily form.");
      return;
    }
    if (!exists || !formId) {
      setError("No form exists for this date/shift.");
      return;
    }

    setLoading(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch(`${API_URL}/api/daily-forms/${formId}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cashSummary: {
            actualCashCounted: normalizeNum(actualCashCounted),
            differenceExplanation: differenceExplanation || "",
          },
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Submit failed");

      setStatus(data.form.status || "submitted");
      setOkMsg("Form submitted. It is now read-only.");
    } catch (e) {
      setError(e.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Row handlers
  // ---------------------------

  // Suppliers: cashier can add/remove rows (values)
  const addSupplierRow = () => {
    setSupplierEntries((prev) => [
      ...prev,
      {
        supplierName: "",
        product: "Milk",
        orderedQty: "",
        actualQty: "",
        qtyAfterBoiling: "",
      },
    ]);
  };
  const updateSupplierRow = (idx, key, value) => {
    setSupplierEntries((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  };
  const removeSupplierRow = (idx) =>
    setSupplierEntries((prev) => prev.filter((_, i) => i !== idx));

  // Items: NO add/remove in strict version (structure = products)
  const updateItemRow = (idx, key, value) => {
    setItems((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  };

  // Optional expenses rows (you already support)
  const addExpenseRow = () => {
    setExpenses((prev) => [
      ...prev,
      { category: "", description: "", amount: "", paymentMethod: "cash" },
    ]);
  };
  const updateExpenseRow = (idx, key, value) => {
    setExpenses((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  };
  const removeExpenseRow = (idx) =>
    setExpenses((prev) => prev.filter((_, i) => i !== idx));

  // ---------------------------
  // Effects
  // ---------------------------

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    fetchDraftStrict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shift]);

  // ---------------------------
  // UI restrictions
  // ---------------------------

  const disableDateShift = locked || isCashier; // cashier cannot change date/shift
  const disableAllInputs = locked || (!exists && isCashier); // cashier can't fill if form doesn't exist
  const disableStructureInputs = true; // itemCode/itemName always locked in strict mode

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

            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Milk Shop Daily Records
                </h1>
                <p className="text-sm text-gray-600">
                  {business?.name || "Business"} • Role: {role}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                exists
                  ? status === "draft"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : status === "submitted"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              Status: {exists ? status.toUpperCase() : "NOT CREATED"}
            </span>

            <button
              onClick={saveDraft}
              disabled={loading || locked || !exists}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>

            <button
              onClick={submitForm}
              disabled={loading || locked || !canSubmit || !exists}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:bg-gray-400"
            >
              <Lock className="w-4 h-4" /> Submit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {okMsg && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{okMsg}</p>
          </div>
        )}

        {/* Header fields */}
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                disabled={disableDateShift}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />

              <label className="block text-xs font-semibold text-gray-700 mt-3 mb-1">
                Shift
              </label>
              <select
                value={shift}
                disabled={disableDateShift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Recorded by
              </label>
              <input
                value={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
              />

              <label className="block text-xs font-semibold text-gray-700 mt-3 mb-1">
                Approved by
              </label>
              <input
                value={status === "draft" ? "—" : "Approved"}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                KPLC Meter Readings (Opening)
              </label>
              <input
                value={kplcOpening}
                disabled={disableAllInputs}
                onChange={(e) => setKplcOpening(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="0"
              />

              <label className="block text-xs font-semibold text-gray-700 mt-3 mb-1">
                KPLC Meter Readings (Closing)
              </label>
              <input
                value={kplcClosing}
                disabled={disableAllInputs}
                onChange={(e) => setKplcClosing(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Not created yet -> manager creates from products */}
        {!exists && (
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            {canEditStructure ? (
              <>
                <h2 className="text-lg font-bold text-gray-900">
                  Create Today’s Daily Form
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Create the form from Products. Cashier will fill the values during the day.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      setPickerOpen(true);
                      setSelectedProductIds([]);
                      await fetchProducts();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                  >
                    <Plus className="w-4 h-4" /> Create from Products
                  </button>

                  <button
                    onClick={() => fetchDraftStrict()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold transition disabled:opacity-60"
                  >
                    Refresh
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900">
                  Daily Form Not Created Yet
                </h2>
                <p className="text-sm text-gray-600">
                  Owner/Manager must create today’s form first. Please notify them.
                </p>
              </>
            )}
          </div>
        )}

        {/* Form tables */}
        {exists && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supplier table */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Supplier Deliveries
                  </h2>
                  <p className="text-sm text-gray-600">
                    Cashier fills values (bonus auto-calculated)
                  </p>
                </div>
                <button
                  onClick={addSupplierRow}
                  disabled={disableAllInputs}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:bg-gray-400"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">No</th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Supplier
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Product
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Qty Supplied
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Actual Qty
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        After Boiling
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Bonus
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {computedSupplierEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-6 text-gray-600 text-center"
                        >
                          No supplier entries yet.
                        </td>
                      </tr>
                    ) : (
                      computedSupplierEntries.map((s, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              value={s.supplierName}
                              disabled={disableAllInputs}
                              onChange={(e) =>
                                updateSupplierRow(
                                  idx,
                                  "supplierName",
                                  e.target.value
                                )
                              }
                              className="w-40 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={s.product || "Milk"}
                              disabled={disableAllInputs}
                              onChange={(e) =>
                                updateSupplierRow(idx, "product", e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={s.orderedQty}
                              disabled={disableAllInputs}
                              onChange={(e) =>
                                updateSupplierRow(idx, "orderedQty", e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={s.actualQty}
                              disabled={disableAllInputs}
                              onChange={(e) =>
                                updateSupplierRow(idx, "actualQty", e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={s.qtyAfterBoiling}
                              disabled={disableAllInputs}
                              onChange={(e) =>
                                updateSupplierRow(
                                  idx,
                                  "qtyAfterBoiling",
                                  e.target.value
                                )
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-900">
                            {normalizeNum(s.bonusQty).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => removeSupplierRow(idx)}
                              disabled={disableAllInputs}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 transition disabled:opacity-60"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock & sales table */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Stock & Sales</h2>
                <p className="text-sm text-gray-600">
                  Structure comes from Products. Values editable, totals auto-calc.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1100px] text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Item Code</th>
                      <th className="px-3 py-2 text-left font-semibold">Item</th>
                      <th className="px-3 py-2 text-left font-semibold">Opening</th>
                      <th className="px-3 py-2 text-left font-semibold">New In</th>
                      <th className="px-3 py-2 text-left font-semibold">Spoilt</th>
                      <th className="px-3 py-2 text-left font-semibold">Total Avail</th>
                      <th className="px-3 py-2 text-left font-semibold">Qty Sold</th>
                      <th className="px-3 py-2 text-left font-semibold">Cash</th>
                      <th className="px-3 py-2 text-left font-semibold">Bank</th>
                      <th className="px-3 py-2 text-left font-semibold">Debt</th>
                      <th className="px-3 py-2 text-left font-semibold">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {computedItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-6 text-gray-600 text-center">
                          No items found in this form.
                        </td>
                      </tr>
                    ) : (
                      computedItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <input
                              value={it.itemCode}
                              disabled={disableStructureInputs}
                              readOnly
                              className="w-28 px-2 py-1 border border-gray-200 rounded-md text-sm bg-gray-50"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={it.itemName}
                              disabled={disableStructureInputs}
                              readOnly
                              className="w-40 px-2 py-1 border border-gray-200 rounded-md text-sm bg-gray-50"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.openingStock}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(idx, "openingStock", e.target.value)
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.newStockIn}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(idx, "newStockIn", e.target.value)
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.spoiledDisposed}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(
                                  idx,
                                  "spoiledDisposed",
                                  e.target.value
                                )
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2 font-semibold text-gray-900">
                            {normalizeNum(it.totalAvailable).toFixed(2)}
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.qtySold}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(idx, "qtySold", e.target.value)
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.salesCash}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(idx, "salesCash", e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.salesBank}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(idx, "salesBank", e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={it.salesDebt}
                              disabled={disableAllInputs || !canEditValues}
                              onChange={(e) =>
                                updateItemRow(idx, "salesDebt", e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="px-3 py-2 font-semibold text-gray-900">
                            {normalizeNum(it.closingStock).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Optional expenses editor */}
              <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Expenses</h3>
                    <p className="text-xs text-gray-600">Optional (affects Expected Cash At Hand)</p>
                  </div>
                  <button
                    onClick={addExpenseRow}
                    disabled={disableAllInputs || !canEditValues}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold transition disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" /> Add Expense
                  </button>
                </div>

                {expenses.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Category</th>
                          <th className="px-3 py-2 text-left font-semibold">Description</th>
                          <th className="px-3 py-2 text-left font-semibold">Amount</th>
                          <th className="px-3 py-2 text-left font-semibold">Pay Method</th>
                          <th className="px-3 py-2 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenses.map((e, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <input
                                value={e.category}
                                disabled={disableAllInputs || !canEditValues}
                                onChange={(ev) => updateExpenseRow(idx, "category", ev.target.value)}
                                className="w-40 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={e.description || ""}
                                disabled={disableAllInputs || !canEditValues}
                                onChange={(ev) => updateExpenseRow(idx, "description", ev.target.value)}
                                className="w-56 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={e.amount}
                                disabled={disableAllInputs || !canEditValues}
                                onChange={(ev) => updateExpenseRow(idx, "amount", ev.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={e.paymentMethod || "cash"}
                                disabled={disableAllInputs || !canEditValues}
                                onChange={(ev) => updateExpenseRow(idx, "paymentMethod", ev.target.value)}
                                className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              >
                                <option value="cash">Cash</option>
                                <option value="mobile">Mobile</option>
                                <option value="bank">Bank</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeExpenseRow(idx)}
                                disabled={disableAllInputs || !canEditValues}
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 transition disabled:opacity-60"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cash summary + notes */}
        {exists && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cash Summary</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold">Total Cash In</p>
                  <p className="text-lg font-bold text-gray-900">{cashSummary.totalCashIn.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold">Total Bank In</p>
                  <p className="text-lg font-bold text-gray-900">{cashSummary.totalBankIn.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold">Total Debt</p>
                  <p className="text-lg font-bold text-gray-900">{cashSummary.totalDebt.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold">Total Expenses</p>
                  <p className="text-lg font-bold text-gray-900">{cashSummary.totalExpenses.toFixed(2)}</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 col-span-2">
                  <p className="text-xs text-blue-700 font-semibold">Expected Cash At Hand</p>
                  <p className="text-xl font-extrabold text-blue-900">{cashSummary.expectedCashAtHand.toFixed(2)}</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Actual Cash Counted
                  </label>
                  <input
                    value={actualCashCounted}
                    disabled={disableAllInputs || !canEditValues}
                    onChange={(e) => setActualCashCounted(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="0"
                  />
                </div>

                <div className="bg-red-50 rounded-lg p-3 border border-red-200 col-span-2">
                  <p className="text-xs text-red-700 font-semibold">Cash Difference</p>
                  <p className="text-xl font-extrabold text-red-800">{cashSummary.cashDifference.toFixed(2)}</p>
                  <p className="text-xs text-red-700 mt-1">
                    If not zero, explanation is required to submit.
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Difference Explanation
                  </label>
                  <input
                    value={differenceExplanation}
                    disabled={disableAllInputs || !canEditValues}
                    onChange={(e) => setDifferenceExplanation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Explain cash over/short"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2">NOTES</h3>
              <p className="text-sm text-gray-600 mb-3">
                Use this area to explain spoilage, shortages, or unusual events.
              </p>
              <textarea
                rows={10}
                value={notes}
                disabled={disableAllInputs || !canEditValues}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Write notes here..."
              />
            </div>
          </div>
        )}
      </main>

      {/* Products Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPickerOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 mx-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Create Daily Form from Products
                </h3>
                <p className="text-sm text-gray-600">
                  Select products to include. If you select none, all active products will be used.
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-auto border border-gray-200 rounded-lg">
              {productsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  No active products found.
                </div>
              ) : (
                products.map((p) => {
                  const checked = selectedProductIds.includes(p._id);
                  return (
                    <label
                      key={p._id}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedProductIds((prev) =>
                            e.target.checked
                              ? [...prev, p._id]
                              : prev.filter((id) => id !== p._id)
                          );
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {(p.itemCode || "—")} — {(p.name || p.productName || "Unnamed")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {p.category || "general"} • {p.unit || "unit"}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedProductIds([])}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
              >
                Clear selection
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPickerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={createFormFromProducts}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:bg-gray-400"
                >
                  Create Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
