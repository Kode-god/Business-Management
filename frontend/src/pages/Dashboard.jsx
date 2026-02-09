import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard,
  LogOut,
  Building2,
  UserCircle2,
  Shield,
  FileText,
  Package,
  Users,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fallback to localStorage in case useAuth user is null after refresh
  const storedUser = useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const storedBusiness = useMemo(() => {
    try {
      const b = localStorage.getItem("business");
      return b ? JSON.parse(b) : null;
    } catch {
      return null;
    }
  }, []);

  const storedRole = useMemo(() => localStorage.getItem("role") || null, []);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const currentUser = user || storedUser;
  const business = storedBusiness; // backend returns business separately
  const role = (currentUser?.role || storedRole || "cashier").toLowerCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const go = (path) => navigate(path);

  const displayName =
    currentUser?.firstName || currentUser?.lastName
      ? `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim()
      : "User";

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  // If user is still not available, protect dashboard UI
  const isAuthed = Boolean(token);

  // -----------------------
  // REAL DASHBOARD SUMMARY
  // -----------------------
  const [summary, setSummary] = useState({
    dailyFormsThisMonth: 0,
    submittedThisMonth: 0,
    activeProducts: 0,
    usersCount: 0,
    accountStatus: "Active",
    latestForm: null,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) return;

      setLoadingSummary(true);
      setSummaryError("");

      try {
        const res = await fetch(`${API_URL}/api/dashboard/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || data?.error || "Failed to load dashboard summary");
        }

        setSummary((prev) => ({ ...prev, ...(data.summary || {}) }));
      } catch (e) {
        setSummaryError(e.message || "Failed to load dashboard summary");
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [token]);

  const latestFormText = useMemo(() => {
    if (!summary?.latestForm) return "No daily forms yet.";
    const d = new Date(summary.latestForm.date);
    const dStr = d.toLocaleDateString();
    const shift = summary.latestForm.shift || "—";
    const st = (summary.latestForm.status || "—").toUpperCase();
    return `${dStr} • ${shift} • ${st}`;
  }, [summary]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Milk Management System</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Session warning (helps during dev) */}
        {!isAuthed && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-semibold">Not authenticated</p>
              <p className="text-yellow-700 text-sm">No token found. Please login again.</p>
            </div>
          </div>
        )}

        {/* Summary API error */}
        {summaryError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Dashboard data failed to load</p>
              <p className="text-red-700 text-sm">{summaryError}</p>
              <p className="text-red-700 text-xs mt-1">
                Ensure backend endpoint exists: <span className="font-mono">GET /api/dashboard/summary</span>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Welcome / Context */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Welcome, {displayName}!</h2>

                <div className="flex flex-wrap items-center gap-3 text-blue-100">
                  <span className="inline-flex items-center gap-2">
                    <UserCircle2 className="w-4 h-4" />
                    {currentUser?.email || "—"}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {roleLabel}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {business?.name || "—"}
                    {business?.location ? ` • ${business.location}` : ""}
                  </span>
                </div>

                <p className="text-blue-100 mt-3 text-sm">
                  Your data is scoped to your business automatically via{" "}
                  <span className="font-semibold">businessId</span>.
                </p>
              </div>

              <div className="bg-white/10 rounded-xl p-4 border border-white/20 min-w-[220px]">
                <p className="text-sm text-blue-100">Account status</p>
                <p className="text-lg font-bold">
                  {currentUser?.isActive === false ? "Inactive" : summary?.accountStatus || "Active"}
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  {currentUser?.isActive === false ? "Contact the owner to reactivate." : "All systems operational"}
                </p>
              </div>
            </div>
          </div>

          {/* KPI Cards (REAL VALUES) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-medium">Daily Forms</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loadingSummary ? "…" : summary.dailyFormsThisMonth}
              </p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-medium">Submitted Forms</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loadingSummary ? "…" : summary.submittedThisMonth}
              </p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
              <p className="text-gray-600 text-sm font-medium">Active Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loadingSummary ? "…" : summary.activeProducts}
              </p>
              <p className="text-xs text-gray-500 mt-1">Available items</p>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
              <p className="text-gray-600 text-sm font-medium">Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loadingSummary ? "…" : summary.usersCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </div>
          </div>

          {/* Latest Daily Form */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <p className="font-semibold text-gray-900 mb-1">Latest Daily Form</p>
            <p className="text-gray-600 text-sm">{loadingSummary ? "Loading…" : latestFormText}</p>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Business Type</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{business?.businessType || "—"}</p>
            <p className="text-xs text-gray-500 mt-1">As configured during registration</p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Forms */}
            <div
              onClick={() => go("/daily-forms")}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Daily Forms</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Submit and manage daily milk collection and production forms.
                  </p>
                  <span className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                    Go to Forms <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Products */}
            <div
              onClick={() => go("/products")}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Products</h3>
                  </div>
                  <p className="text-gray-600 mb-6">Manage products, pricing, and availability information.</p>
                  <span className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                    Manage Products <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Reports */}
            <div
              onClick={() => navigate("/reports")}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border border-gray-100"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reports</h3>
              <p className="text-gray-600 mb-6">
                View and print Daily, Weekly (Mon–Sun), Stock Balance and Monthly summary reports.
              </p>
              <span className="text-blue-600 hover:text-blue-700 font-semibold">View Reports →</span>
            </div>

            {/* Owner-only: Users */}
            {role === "owner" && (
              <div
                onClick={() => go("/users")}
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border border-gray-100 md:col-span-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="text-xl font-bold text-gray-900">User Management</h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Add, update, and deactivate users (manager/cashier). Only owners can manage users.
                    </p>
                    <span className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                      Manage Users <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="hidden md:flex flex-col items-end text-sm text-gray-500">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold">Owner only</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
