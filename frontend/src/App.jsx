import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoutes';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { DailyForms } from './pages/DailyForms';
import { Products } from './pages/Products';
import { Users } from './pages/Users';
import Reports from "./pages/Reports.jsx";
import DailySummaryPrint from "./pages/DailySummaryPrint.jsx";
import WeeklySalesReport from "./pages/WeeklySalesReport.jsx";
import WeeklyExpensesReport from "./pages/WeeklyExpensesReport.jsx";
import StockBalanceReport from "./pages/StockBalanceReport.jsx";
import MonthlySummaryReport from "./pages/MonthlySummaryReport.jsx";
import './index.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/daily/:formId" element={<DailySummaryPrint />} />
          <Route path="/reports/weekly-sales" element={<WeeklySalesReport />} />
          <Route path="/reports/weekly-expenses" element={<WeeklyExpensesReport />} />
          <Route path="/reports/stock-balance" element={<StockBalanceReport />} />
          <Route path="/reports/monthly-summary" element={<MonthlySummaryReport />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/daily-forms"
            element={
              <ProtectedRoute>
                <DailyForms />
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
