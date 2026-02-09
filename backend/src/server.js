import express from "express";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import Inquiry from "./models/Inquiry.js";

/* core */
import connectDB from "./lib/db.js";
import setupSocket from "./lib/socket.js";
import corsMiddleware from "./middleware/cors.js";

/* auth */
import loginRoute from "./api/auth/login.js";
import registerRoute from "./api/auth/register.js";
import refreshRoute from "./api/auth/refresh.js";
import logoutRoute from "./api/auth/logout.js";
import meRoute from "./api/auth/me.js";
import forgotPasswordRoute from "./api/auth/forgot-password.js";
import resetPasswordRoute from "./api/auth/reset-password.js";

/* orders */
import createOrder from "./api/orders/create.js";
import assignOrder from "./api/orders/assign.js";
import acceptOrder from "./api/orders/accept.js";
import myOrders from "./api/orders/my-orders.js";
import botCreateOrder from "./api/orders/bot-create.js";
import deliverOrder from "./api/orders/deliver.js";
import payOrder from "./api/orders/pay.js";
import payDeliveryFee from "./api/orders/payDelivery.js";
import { confirmGoodsPayment } from "./api/vendors/orders.js";
import confirmReceipt from "./api/orders/receipt.js";
import { getOrderStatus } from "./api/orders/status.js";

/* riders */
import riderRegister from "./api/riders/register.js";
import nearbyRiders from "./api/riders/nearby.js";
import riderMe from "./api/riders/me.js";
import { goOnline, goOffline, heartbeat } from "./api/riders/status.js";
import { acceptOrder, rejectOrder } from "./api/riders/orders.js";

/* payments */
/* payments */
import paymentRoutes from "./api/payments/routes.js";

/* vendors */
import vendorRegister from "./api/vendors/register.js";
import vendorInventory from "./api/vendors/inventory.js";
import vendorPublic from "./api/vendors/public.js";
import vendorDispatch from "./api/vendors/dispatch.js";
import vendorSettings from "./api/vendors/settings.js";

/* admin */
import adminDashboard from "./api/admin/dashboard.js";
import adminRiders from "./api/admin/riders.js";
import adminOrders from "./api/admin/orders.js";
import adminVendors from "./api/admin/vendors.js";
import adminSettings from "./api/admin/settings.js";
import adminFaqs from "./api/admin/faqs.js";
import chatRoute from "./api/chat/chat.routes.js";
import pushRoute from "./api/notifications/push.js";
import financeRoute from "./api/admin/finance.js";

/* middleware */
import requireAuth from "./middleware/requireAuth.js";
import requireAdmin from "./middleware/requireAdmin.js";



import cron from "node-cron";
import { runDailyPayouts } from "./api/payments/payouts.js";
import { startRiderCleanupJob } from "./jobs/rider-cleanup.js";
import { startVendorScheduleJobs } from "./jobs/vendor-schedule.js";

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  /* Cron Jobs */
  // Schedule Daily Payouts at 9 PM (21:00)
  cron.schedule("0 21 * * *", async () => {
    console.log("⏰ Running Daily Payout Job (9 PM)...");
    try {
      const result = await runDailyPayouts();
      console.log(`✅ Daily Payouts Complete: Processed ${result.processedCount}, Total KES ${result.totalPayout}`);
    } catch (err) {
      console.error("❌ Daily Payout Job Failed:", err);
    }
  });

  /* Start Rider Cleanup Job */
  startRiderCleanupJob();

  app.set("trust proxy", 1);

  /* middleware */
  app.use(corsMiddleware); // MUST allow credentials
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use(morgan("dev"));

  /* health */
  app.get("/health", (_, res) => {
    res.json({ status: "ok", service: "NeighborhoodRider API" });
  });

  app.get("/", (_, res) => {
    res.json({ message: "Neighborhood Rider API is running 🚀" });
  });

  /* auth */
  app.post("/api/auth/login", loginRoute);
  app.post("/api/auth/register", registerRoute);
  app.post("/api/auth/refresh", refreshRoute);
  app.post("/api/auth/logout", logoutRoute);
  app.get("/api/auth/me", requireAuth, meRoute);
  app.post("/api/auth/forgot-password", forgotPasswordRoute);
  app.post("/api/auth/reset-password/:token", resetPasswordRoute);

  /* orders */
  app.post("/api/orders/create", requireAuth, createOrder);
  app.post("/api/orders/assign", requireAuth, requireAdmin, assignOrder);
  app.post("/api/orders/accept", requireAuth, acceptOrder);
  app.use("/api/orders/my", requireAuth, myOrders);
  app.use("/api/orders/bot-create", botCreateOrder);
  app.post("/api/orders/deliver", requireAuth, deliverOrder);
  app.post("/api/orders/pay", requireAuth, payOrder);
  app.post("/api/orders/pay-delivery", requireAuth, payDeliveryFee);
  app.post("/api/orders/confirm-receipt", requireAuth, confirmReceipt);
  app.get("/api/orders/:id/status", requireAuth, getOrderStatus);

  /* riders */
  app.post("/api/riders/register", requireAuth, riderRegister);
  app.use("/api/riders/nearby", requireAuth, nearbyRiders);
  app.get("/api/riders/me", requireAuth, riderMe);
  app.post("/api/riders/go-online", requireAuth, goOnline);
  app.post("/api/riders/go-offline", requireAuth, goOffline);
  app.post("/api/riders/heartbeat", requireAuth, heartbeat);
  app.post("/api/riders/accept-order", requireAuth, acceptOrder);
  app.post("/api/riders/reject-order", requireAuth, rejectOrder);

  /* vendors */
  app.post("/api/vendors/register", requireAuth, vendorRegister);
  app.get("/api/vendors/inventory", requireAuth, vendorInventory.getInventory);
  app.post("/api/vendors/inventory", requireAuth, vendorInventory.addItem);
  app.post("/api/vendors/inventory", requireAuth, vendorInventory.addItem);
  app.delete("/api/vendors/inventory/:itemId", requireAuth, vendorInventory.removeItem);
  app.patch("/api/vendors/me", requireAuth, vendorSettings.updateVendor);
  app.delete("/api/vendors/me", requireAuth, vendorSettings.deleteVendor);
  app.get("/api/vendors/me", requireAuth, vendorSettings.getVendorProfile);

  // Vendor Order Management

  import vendorCancelOrder from "./api/vendors/cancel.js";

  app.patch("/api/orders/:id/confirm-goods", requireAuth, confirmGoodsPayment);
  app.post("/api/vendors/orders/:id/cancel", requireAuth, vendorCancelOrder);

  /* public vendor routes */
  app.get("/api/vendors/nearby", vendorPublic.listPublicVendors);
  app.get("/api/vendors/:id/public", vendorPublic.getPublicVendorDetails);
  app.post("/api/vendors/orders/dispatch", requireAuth, vendorDispatch);


  /* payments */
  /* payments */
  app.use("/api/payments", paymentRoutes);

  /* wallet */
  const walletRoutes = (await import("./api/wallet/routes.js")).default;
  app.use("/api/wallet", walletRoutes);

  /* notifications (public/protected mixed) */
  /* notifications (public/protected mixed) */
  app.post("/api/notify-admin", async (req, res) => {
    try {
      const { items, summary, location, email, message, subject } = req.body;

      const inquiryData = {
        email,
        timestamp: new Date(),
        status: "unread",
        subject: subject || (items ? "New Order Inquiry" : "General Inquiry"),
      };

      if (items) {
        inquiryData.items = items;
        inquiryData.location = location;
        inquiryData.summary = summary;
      } else {
        inquiryData.message = message;
      }

      const inquiry = await Inquiry.create(inquiryData);

      // Emit to admin via socket if possible (TODO)

      res.json({ success: true, inquiry });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to notify admin" });
    }
  });

  /* admin inquiries */
  app.get("/api/admin/inquiries", requireAuth, requireAdmin, async (req, res) => {
    try {
      const inquiries = await Inquiry.find().sort({ timestamp: -1 });
      res.json(inquiries);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });

  /* admin */
  app.use(
    "/api/admin/dashboard",
    requireAuth,
    requireAdmin,
    adminDashboard
  );
  app.use("/api/admin/riders", requireAuth, requireAdmin, adminRiders);
  app.use("/api/admin/orders", requireAuth, requireAdmin, adminOrders);
  app.get("/api/admin/vendors", requireAuth, requireAdmin, adminVendors.listVendors);
  app.patch("/api/admin/vendors/:id/approve", requireAuth, requireAdmin, adminVendors.updateVendorStatus);

  app.use("/api/admin/orders", requireAuth, requireAdmin, adminOrders);
  app.use("/api/admin/finance", requireAuth, requireAdmin, financeRoute);
  app.use("/api/admin/finance", requireAuth, requireAdmin, financeRoute);

  /* admin settings */
  app.get("/api/admin/settings", requireAuth, requireAdmin, adminSettings.getSystemSettings);
  app.put("/api/admin/settings", requireAuth, requireAdmin, adminSettings.updateSystemSettings);

  app.use("/api/faqs", adminFaqs); // Public read, admin write

  /* chat */
  app.use("/api/chat", chatRoute);

  /* reviews */
  const reviewRoutes = (await import("./api/reviews/routes.js")).default;
  app.use("/api/reviews", reviewRoutes);

  /* notifications */
  app.use("/api/notifications", pushRoute);


  /* socket */
  const io = new Server(server, {
    cors: {
      origin: [
        "https://neighbourhood-rider.vercel.app",
        "http://localhost:3000",
        process.env.CLIENT_URL
      ].filter(Boolean),
      credentials: true,
    },
  });

  app.set("io", io);
  setupSocket(io);

  /* 404 */
  app.use((_, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  /* error */
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  await connectDB();
  console.log("✅ MongoDB connected");

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
