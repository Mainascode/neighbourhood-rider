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

/* riders */
import riderRegister from "./api/riders/register.js";
import nearbyRiders from "./api/riders/nearby.js";
import riderMe from "./api/riders/me.js";


/* payments */
import mpesaPayment from "./api/payments/mpesa.js";
import mpesaCallback from "./api/payments/callback.js";

/* admin */
import adminDashboard from "./api/admin/dashboard.js";
import adminRiders from "./api/admin/riders.js";
import adminOrders from "./api/admin/orders.js";
import adminFaqs from "./api/admin/faqs.js";
import adminFaqs from "./api/admin/faqs.js";
import chatRoute from "./api/chat/chat.routes.js";
import pushRoute from "./api/notifications/push.js";

/* middleware */
import requireAuth from "./middleware/requireAuth.js";
import requireAdmin from "./middleware/requireAdmin.js";



async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.set("trust proxy", 1);

  /* middleware */
  app.use(corsMiddleware); // MUST allow credentials
  app.use(express.json({ limit: "1mb" }));
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

  /* riders */
  app.post("/api/riders/register", requireAuth, riderRegister);
  app.use("/api/riders/nearby", requireAuth, nearbyRiders);
  app.get("/api/riders/me", requireAuth, riderMe);


  /* payments */
  app.post("/api/payments/mpesa", requireAuth, mpesaPayment);
  app.post("/api/payments/callback", mpesaCallback);

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
  app.use("/api/admin/orders", requireAuth, requireAdmin, adminOrders);
  app.use("/api/faqs", adminFaqs); // Public read, admin write

  /* chat */
  app.use("/api/chat", chatRoute);

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
