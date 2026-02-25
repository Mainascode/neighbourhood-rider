// src/App.js
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import PrivateRoute from "./components/PrivateRoute";
import RouteLoader from "./components/RouteLoader";
import AppErrorBoundary from "./components/AppErrorBoundary";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/auth/login"));
const Register = lazy(() => import("./pages/auth/register"));
const SupabaseLogin = lazy(() => import("./pages/supabase-auth/Login"));
const SupabaseSignup = lazy(() => import("./pages/supabase-auth/Signup"));
const SupabaseDashboard = lazy(() => import("./pages/supabase-auth/Dashboard"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"));
const JoinRider = lazy(() => import("./pages/JoinRider"));
const Order = lazy(() => import("./pages/Order"));
const Parcel = lazy(() => import("./pages/Parcel"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Faqs = lazy(() => import("./pages/Faqs"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const JoinVendor = lazy(() => import("./pages/JoinVendor"));
const VendorDashboard = lazy(() => import("./pages/vendor/VendorDashboard"));
const SupabaseProtectedRoute = lazy(() =>
  import("./components/supabase-auth/SupabaseProtectedRoute")
);

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
            <Route path="/supabase/login" element={<SupabaseLogin />} />
            <Route path="/supabase/signup" element={<SupabaseSignup />} />
            <Route
              path="/supabase/dashboard"
              element={
                <SupabaseProtectedRoute>
                  <SupabaseDashboard />
                </SupabaseProtectedRoute>
              }
            />
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

            {/* 🏍️ Rider */}
            <Route path="/join" element={<PrivateRoute><JoinRider /></PrivateRoute>} />
            <Route path="/rider/dashboard" element={<PrivateRoute><RiderDashboard /></PrivateRoute>} />
            <Route path="/rider/map" element={<PrivateRoute><RiderDashboard tab="map" /></PrivateRoute>} />
            <Route path="/rider/orders" element={<PrivateRoute><RiderDashboard tab="orders" /></PrivateRoute>} />
            <Route path="/rider/faqs" element={<PrivateRoute><RiderDashboard tab="faqs" /></PrivateRoute>} />
            <Route path="/rider/settings" element={<PrivateRoute><RiderDashboard tab="profile" /></PrivateRoute>} />

            {/* 🔐 Admin */}
            <Route path="/admin/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />

            {/* 🏪 Vendor */}
            <Route path="/join-vendor" element={<PrivateRoute><JoinVendor /></PrivateRoute>} />
            <Route path="/vendor/dashboard" element={<PrivateRoute><VendorDashboard /></PrivateRoute>} />
            <Route path="/vendor/settings" element={<PrivateRoute><VendorDashboard initialTab="settings" /></PrivateRoute>} />
          </Routes>
        </Suspense>
      </Router>
    </AppErrorBoundary>
  );
}
