import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
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

const normalizeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const Badge = ({ children, variant = "gray" }) => {
  const styles =
    variant === "green"
      ? "bg-green-50 text-green-700 border-green-200"
      : variant === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles}`}>
      {children}
    </span>
  );
};

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 mx-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">Fill the product details then save.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

export const Products = () => {
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("token"), []);
  const role = useMemo(() => (localStorage.getItem("role") || "cashier").toLowerCase(), []);
  const business = useMemo(() => safeJson(localStorage.getItem("business"), null), []);

  const isManagerOrOwner = role === "owner" || role === "manager";
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("active"); // active | inactive | all

  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [currentId, setCurrentId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    itemCode: "",
    name: "",
    unit: "pcs",
    category: "general",
    sellingPrice: "",
    costPrice: "",
    reorderLevel: "",
    isActive: true,
  });

  const resetForm = () => {
    setForm({
      itemCode: "",
      name: "",
      unit: "pcs",
      category: "general",
      sellingPrice: "",
      costPrice: "",
      reorderLevel: "",
      isActive: true,
    });
    setCurrentId(null);
  };

  const openCreate = () => {
    setMode("create");
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setMode("edit");
    setCurrentId(p._id);
    setForm({
      itemCode: p.itemCode || "",
      name: p.name || "",
      unit: p.unit || "pcs",
      category: p.category || "general",
      sellingPrice: String(p.sellingPrice ?? ""),
      costPrice: String(p.costPrice ?? ""),
      reorderLevel: String(p.reorderLevel ?? ""),
      isActive: p.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => resetForm(), 150);
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());

    if (activeFilter === "active") params.set("active", "true");
    if (activeFilter === "inactive") params.set("active", "false");
    if (activeFilter === "all") params.delete("active");

    return params.toString();
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    setOkMsg("");

    try {
      const qs = buildQuery();
      const res = await fetch(`${API_URL}/api/products${qs ? `?${qs}` : ""}`, {
        method: "GET",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to fetch products");

      setProducts(data.products || []);
    } catch (e) {
      setError(e.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!String(form.itemCode || "").trim()) return "Item Code is required.";
    if (!String(form.name || "").trim()) return "Product name is required.";
    const sp = normalizeNum(form.sellingPrice);
    if (sp < 0) return "Selling price cannot be negative.";
    const cp = normalizeNum(form.costPrice);
    if (cp < 0) return "Cost price cannot be negative.";
    const rl = normalizeNum(form.reorderLevel);
    if (rl < 0) return "Reorder level cannot be negative.";
    return null;
  };

  const saveProduct = async () => {
    if (!isManagerOrOwner) {
      setError("Only owner/manager can add or edit products.");
      return;
    }

    setError("");
    setOkMsg("");

    const v = validateForm();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        itemCode: String(form.itemCode).trim(),
        name: String(form.name).trim(),
        unit: String(form.unit || "pcs").trim(),
        category: String(form.category || "general").trim(),
        sellingPrice: normalizeNum(form.sellingPrice),
        costPrice: normalizeNum(form.costPrice),
        reorderLevel: normalizeNum(form.reorderLevel),
        isActive: Boolean(form.isActive),
      };

      const url =
        mode === "create"
          ? `${API_URL}/api/products`
          : `${API_URL}/api/products/${currentId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Save failed");

      setOkMsg(mode === "create" ? "Product created successfully." : "Product updated successfully.");
      closeModal();
      await fetchProducts();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const deactivateProduct = async (p) => {
    if (!isManagerOrOwner) {
      setError("Only owner/manager can deactivate products.");
      return;
    }

    setError("");
    setOkMsg("");

    const ok = window.confirm(`Deactivate ${p.itemCode} - ${p.name}?`);
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/products/${p._id}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Deactivate failed");

      setOkMsg("Product deactivated.");
      await fetchProducts();
    } catch (e) {
      setError(e.message || "Deactivate failed");
    } finally {
      setLoading(false);
    }
  };

  // Auth guard
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Fetch on load + when filters change (debounce search)
  useEffect(() => {
    if (!token) return;

    const t = setTimeout(() => {
      fetchProducts();
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
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
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <p className="text-sm text-gray-600">
                  {business?.name || "Business"} • Role: {role}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold transition disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {isManagerOrOwner && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Alerts */}
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

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Search by item code or name..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 md:text-right">
              <span className="font-semibold text-gray-900">{products.length}</span> product(s)
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Product List</h2>
              <p className="text-sm text-gray-600">
                Products are business-scoped and feed Daily Forms (Item Code + Item Name).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Item Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold">Selling</th>
                  <th className="px-4 py-3 text-left font-semibold">Cost</th>
                  <th className="px-4 py-3 text-left font-semibold">Reorder</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-600">
                      {loading ? "Loading..." : "No products found."}
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.itemCode}</td>
                      <td className="px-4 py-3 text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-700">{p.category || "general"}</td>
                      <td className="px-4 py-3 text-gray-700">{p.unit || "pcs"}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {normalizeNum(p.sellingPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {normalizeNum(p.costPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{normalizeNum(p.reorderLevel)}</td>
                      <td className="px-4 py-3">
                        {p.isActive ? <Badge variant="green">Active</Badge> : <Badge variant="red">Inactive</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            disabled={!isManagerOrOwner}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold transition disabled:opacity-50"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>

                          <button
                            onClick={() => deactivateProduct(p)}
                            disabled={!isManagerOrOwner || !p.isActive}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={mode === "create" ? "Add Product" : "Edit Product"}
        onClose={closeModal}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item Code *</label>
              <input
                value={form.itemCode}
                onChange={(e) => setForm((s) => ({ ...s, itemCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="e.g. MILK500"
                disabled={!isManagerOrOwner}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="e.g. Fresh Milk 500ml"
                disabled={!isManagerOrOwner}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="general / milk / yoghurt ..."
                disabled={!isManagerOrOwner}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                disabled={!isManagerOrOwner}
              >
                <option value="pcs">pcs</option>
                <option value="litres">litres</option>
                <option value="ml">ml</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price</label>
              <input
                value={form.sellingPrice}
                onChange={(e) => setForm((s) => ({ ...s, sellingPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0"
                disabled={!isManagerOrOwner}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price</label>
              <input
                value={form.costPrice}
                onChange={(e) => setForm((s) => ({ ...s, costPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0"
                disabled={!isManagerOrOwner}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Level</label>
              <input
                value={form.reorderLevel}
                onChange={(e) => setForm((s) => ({ ...s, reorderLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="0"
                disabled={!isManagerOrOwner}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                disabled={!isManagerOrOwner}
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 font-semibold">
                Active
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={loading || !isManagerOrOwner}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:bg-gray-400"
              >
                {mode === "create" ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
