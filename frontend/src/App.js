// src/App.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import JoinRider from "./pages/JoinRider";
import Order from "./pages/Order";
import MyOrders from "./pages/MyOrders";
import PrivateRoute from "./components/PrivateRoute";
import Faqs from "./pages/Faqs";


// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";

// Rider
import RiderDashboard from "./pages/RiderDashboard";

// Live BG
import LiveBackground from "./components/LiveBackground.js";

export default function App() {
  return (
    <Router>
      <LiveBackground />
      <Routes>
        {/* 🌍 Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/faqs" element={<Faqs />} />


        {/* 🚴 User */}
        {/* 🚴 User */}
        <Route path="/order" element={<PrivateRoute><Order /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />

        {/* 🏍️ Rider */}
        <Route path="/join" element={<PrivateRoute><JoinRider /></PrivateRoute>} />
        <Route path="/rider/dashboard" element={<PrivateRoute><RiderDashboard /></PrivateRoute>} />
        <Route path="/rider/map" element={<PrivateRoute><RiderDashboard tab="map" /></PrivateRoute>} />
        <Route path="/rider/orders" element={<PrivateRoute><RiderDashboard tab="orders" /></PrivateRoute>} />
        <Route path="/rider/faqs" element={<PrivateRoute><RiderDashboard tab="faqs" /></PrivateRoute>} />


        {/* 🔐 Admin (email restricted later) */}
        <Route path="/admin/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}
