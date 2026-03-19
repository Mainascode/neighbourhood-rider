// src/App.js
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import PrivateRoute from "./components/PrivateRoute";
import RouteLoader from "./components/RouteLoader";
import AppErrorBoundary from "./components/AppErrorBoundary";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/auth/login"));
const Register = lazy(() => import("./pages/auth/register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"));
const Order = lazy(() => import("./pages/Order"));
const Parcel = lazy(() => import("./pages/Parcel"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Faqs = lazy(() => import("./pages/Faqs"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

export default function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            {/* 🌍 Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />

            {/* 🚴 User */}
            <Route path="/order" element={<PrivateRoute><Order /></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
            <Route path="/parcel" element={<PrivateRoute><Parcel /></PrivateRoute>} />

            {/* 🔐 Admin */}
            <Route path="/admin/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />

            {/* Legacy redirects */}
            <Route path="/join" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/rider/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/rider/map" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/rider/orders" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/rider/faqs" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/rider/settings" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/join-vendor" element={<Navigate to="/order" replace />} />
            <Route path="/vendor/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/vendor/settings" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AppErrorBoundary>
  );
}
