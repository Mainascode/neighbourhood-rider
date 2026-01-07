import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Order from "../models/Order.js";

export default function setupSocket(io) {
  /* auth */
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id name role");

      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 socket:", socket.user.name, socket.user.role);

    socket.on("join:order", (orderId) => {
      socket.join(`order:${orderId}`);
    });

    /* rider live location & persistence */
    socket.on("rider:location", async ({ orderId, lat, lng }) => {
      // Role check (case insensitive)
      if (socket.user.role.toLowerCase() !== "rider") return;

      // Persist to DB
      try {
        await import("../models/Rider.js").then(async ({ default: Rider }) => {
          await Rider.findOneAndUpdate(
            { userId: socket.user._id },
            {
              location: { type: "Point", coordinates: [lng, lat] }, // Memo: GeoJSON is [lng, lat]
              isAvailable: true,
              status: "approved" // Ensure they stay approved/visible
            }
          );
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

    /* mark delivered */
    socket.on("order:delivered", async ({ orderId }) => {
      if (socket.user.role.toLowerCase() !== "rider") return;

      const order = await Order.findById(orderId);
      if (!order || order.status !== "DELIVERING") return;

      order.status = "DELIVERED";
      order.paymentStatus = "UNPAID";
      await order.save();

      io.to(`order:${orderId}`).emit("order:update", order);
      io.to(`order:${orderId}`).emit("payment:required", {
        orderId,
        amount: order.amount,
      });
    });

    socket.on("disconnect", async () => {
      console.log("❌ socket disconnected:", socket.user.name);
      // Mark offline
      if (socket.user.role.toLowerCase() === "rider") {
        await import("../models/Rider.js").then(async ({ default: Rider }) => {
          await Rider.findOneAndUpdate({ userId: socket.user._id }, { isAvailable: false });
        });
      }
    });
  });
}
