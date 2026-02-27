import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { updateOrderStatus, ORDER_STATUS } from "../lib/orderStatus.js";
import { getFirebaseAuth } from "./firebaseAdmin.js";

export default function setupSocket(io) {
  /* auth */
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token) {
        const cookie = socket.handshake.headers?.cookie || "";
        const match = cookie.match(/accessToken=([^;]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
      if (!token) {
        socket.user = null;
        return next();
      }

      let user = null;
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        user = await User.findById(decoded.id).select("_id name role");
      } catch {
        try {
          const firebaseAuth = getFirebaseAuth();
          const decodedFirebaseToken = await firebaseAuth.verifyIdToken(token);
          const email = String(decodedFirebaseToken?.email || "").trim().toLowerCase();
          if (email) {
            user = await User.findOne({ email }).select("_id name role");
          }
        } catch {
          user = null;
        }
      }

      if (!user) {
        socket.user = null;
        return next();
      }

      socket.user = user;
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 socket:", socket.user?.name || "anonymous", socket.user?.role || "anon");
    if (socket.user) {
      const role = String(socket.user.role || "user").toUpperCase();
      socket.join(`notify:${role}:${socket.user._id}`);
    }

    socket.on("join:order", (orderId) => {
      socket.join(`order:${orderId}`);
    });

    /* rider live location & persistence */
    socket.on("rider:location", async ({ orderId, lat, lng }) => {
      if (!socket.user) return;
      // Role check (case insensitive)
      if (socket.user.role.toLowerCase() !== "rider") return;

      // Persist to DB
      try {
        await import("../models/Rider.js").then(async ({ default: Rider }) => {
          const update = {
            location: { type: "Point", coordinates: [lng, lat] },
            lastSeen: new Date(),
          };
          if (orderId) {
            update.status = "ONLINE_BUSY";
            update.isAvailable = false;
          }
          await Rider.findOneAndUpdate({ userId: socket.user._id }, update);
        });
      } catch (err) {
        console.error("Error updating rider loc:", err);
      }

      // Broadcast to specific order room if valid
      if (orderId) {
        io.to(`order:${orderId}`).emit("rider:location:update", {
          lat,
          lng,
          riderId: socket.user._id,
        });
      }
    });

    /* user live location sharing */
    socket.on("user:location", async ({ orderId, lat, lng }) => {
      if (socket.user.role.toLowerCase() !== "user") return;
      if (!orderId) return;

      try {
        const order = await Order.findById(orderId).select("userId");
        if (!order || order.userId?.toString() !== socket.user._id.toString()) {
          return;
        }
      } catch (err) {
        console.error("Error validating user location:", err);
        return;
      }

      io.to(`order:${orderId}`).emit("user:location:update", {
        lat,
        lng,
        userId: socket.user._id,
      });
    });

    socket.on("rider:online", async () => {
      if (!socket.user) return;
      if (socket.user.role.toLowerCase() !== "rider") return;
      try {
        await import("../models/Rider.js").then(async ({ default: Rider }) => {
          await Rider.findOneAndUpdate(
            { userId: socket.user._id },
            { status: "ONLINE_AVAILABLE", isAvailable: true }
          );
        });
        console.log(`Rider ${socket.user.name} is ONLINE`);
      } catch (err) {
        console.error("Error setting rider online via socket:", err);
      }
    });

    socket.on("rider:accept", async ({ orderId }) => {
      // Logic handled via API usually, but if socket only:
      // For now, let's keep logic in API (POST /accept-order) and use socket for notifications.
      // If client emits this, we can log or trigger lightweight updates.
      console.log(`Socket: Rider ${socket.user.name} accepted order ${orderId}`);
    });

    socket.on("rider:reject", async ({ orderId }) => {
      console.log(`Socket: Rider ${socket.user.name} rejected order ${orderId}`);
    });

    /* mark delivered */
    socket.on("order:delivered", async ({ orderId }) => {
      if (!socket.user) return;
      if (socket.user.role.toLowerCase() !== "rider") return;

      const order = await Order.findById(orderId);
      if (!order || order.status !== "ON_THE_WAY") return;

      await updateOrderStatus({
        orderId: order._id,
        fromStatusRaw: order.status,
        toStatus: ORDER_STATUS.DELIVERED,
        actor: { id: socket.user._id, role: socket.user.role, name: socket.user.name },
        source: "socket.order:delivered",
        io,
      });
      order.paymentStatus = "UNPAID";
      await order.save();

      io.to(`order:${orderId}`).emit("order:update", order);
      io.to(`order:${orderId}`).emit("payment:required", {
        orderId,
        amount: order.amount,
      });
    });

    socket.on("disconnect", async () => {
      console.log("❌ socket disconnected:", socket.user?.name || "anonymous");
      // Mark offline
      if (socket.user && socket.user.role.toLowerCase() === "rider") {
        await import("../models/Rider.js").then(async ({ default: Rider }) => {
          await Rider.findOneAndUpdate({ userId: socket.user._id }, { isAvailable: false });
        });
      }
    });
  });
}
