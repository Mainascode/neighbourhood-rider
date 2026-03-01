import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Rider from "../models/Rider.js";
import Order from "../models/Order.js";
import { updateOrderStatus, ORDER_STATUS } from "../lib/orderStatus.js";
import { getFirebaseAuth } from "./firebaseAdmin.js";
import { redisDel, redisExpire, redisHSet, redisSAdd, redisSCard, redisSMembers, redisSRem, redisSet } from "./redis.js";

const RIDER_HEARTBEAT_INTERVAL_MS = 25_000;
const RIDER_HEARTBEAT_TIMEOUT_MS = 35_000;
const riderHeartbeatTimeouts = new Map();

function isRider(socket) {
  return socket.user && String(socket.user.role || "").toLowerCase() === "rider";
}

function isFiniteCoordinate(value) {
  return Number.isFinite(Number(value));
}

function parseLocationPayload(payload = {}) {
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lng)) return null;
  return {
    type: "Point",
    coordinates: [lng, lat],
  };
}

async function markRiderOnline({ riderUserId, socketId, location }) {
  const set = {
    isOnline: true,
    socketId,
    lastSeen: new Date(),
  };

  if (location) {
    set.location = location;
  }

  const rider = await Rider.findOne({ userId: riderUserId });
  if (!rider) return null;
  if (rider.penalties?.isDisabled) return null;

  // Auto-recover availability when rider reconnects from an offline state.
  if (rider.status === "OFFLINE") {
    set.status = "ONLINE_AVAILABLE";
    set.isAvailable = true;
  }

  await Rider.updateOne({ _id: rider._id }, { $set: set });
  const riderId = String(riderUserId);
  await redisHSet(`presence:rider:${riderId}`, {
    isOnline: "1",
    status: String(set.status || rider.status || "ONLINE_AVAILABLE"),
    lastSeen: String(Date.now()),
  });
  await redisExpire(`presence:rider:${riderId}`, 120);
  await redisSAdd(`socket:rider:${riderId}`, socketId);
  await redisSet(`rider:socket:${socketId}`, riderId, 3600);
  return rider._id;
}

async function markRiderOffline({ riderUserId, socketId, reason }) {
  const riderId = String(riderUserId);
  if (socketId) {
    await redisSRem(`socket:rider:${riderId}`, socketId);
    await redisDel(`rider:socket:${socketId}`);
  }
  const openSockets = await redisSCard(`socket:rider:${riderId}`);
  if (openSockets > 0) {
    const members = await redisSMembers(`socket:rider:${riderId}`);
    await Rider.findOneAndUpdate(
      { userId: riderUserId },
      {
        $set: {
          isOnline: true,
          socketId: members[0] || null,
          lastSeen: new Date(),
        },
      },
      { new: true }
    );
    await redisHSet(`presence:rider:${riderId}`, {
      isOnline: "1",
      lastSeen: String(Date.now()),
    });
    await redisExpire(`presence:rider:${riderId}`, 120);
    return;
  }

  await Rider.findOneAndUpdate(
    { userId: riderUserId },
    {
      $set: {
        isOnline: false,
        socketId: null,
        isAvailable: false,
        status: "OFFLINE",
        lastSeen: new Date(),
        lastOfflineReason: reason || "SOCKET_DISCONNECT",
      },
    },
    { new: true }
  );

  if (openSockets <= 0) {
    await redisDel(`presence:rider:${riderId}`);
  }
}

function clearRiderHeartbeatTimeout(riderUserId) {
  const key = String(riderUserId);
  const existing = riderHeartbeatTimeouts.get(key);
  if (existing) {
    clearTimeout(existing);
    riderHeartbeatTimeouts.delete(key);
  }
}

function scheduleRiderHeartbeatTimeout({ riderUserId, socketId }) {
  const key = String(riderUserId);
  clearRiderHeartbeatTimeout(key);

  const timeout = setTimeout(async () => {
    await markRiderOffline({
      riderUserId,
      socketId,
      reason: "HEARTBEAT_TIMEOUT",
    });
    riderHeartbeatTimeouts.delete(key);
  }, RIDER_HEARTBEAT_TIMEOUT_MS);

  riderHeartbeatTimeouts.set(key, timeout);
}

export default function setupSocket(io) {
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
      if (role === "RIDER") {
        socket.join(`rider:${socket.user._id}`);
      }
    }

    socket.emit("presence:config", {
      riderHeartbeatIntervalMs: RIDER_HEARTBEAT_INTERVAL_MS,
    });

    socket.on("join:order", (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("rider:online", async (payload = {}) => {
      if (!isRider(socket)) return;
      try {
        const location = parseLocationPayload(payload);
        await markRiderOnline({
          riderUserId: socket.user._id,
          socketId: socket.id,
          location,
        });
        scheduleRiderHeartbeatTimeout({
          riderUserId: socket.user._id,
          socketId: socket.id,
        });
      } catch (err) {
        console.error("Error setting rider online via socket:", err);
      }
    });

    socket.on("rider:heartbeat", async (payload = {}) => {
      if (!isRider(socket)) return;
      try {
        const location = parseLocationPayload(payload);
        const rider = await Rider.findOne({ userId: socket.user._id }).select("_id status penalties");
        if (!rider || rider.penalties?.isDisabled) return;

        const set = {
          lastSeen: new Date(),
          isOnline: true,
          socketId: socket.id,
        };
        if (location) set.location = location;
        if (rider.status === "OFFLINE") {
          set.status = "ONLINE_AVAILABLE";
          set.isAvailable = true;
        }

        await Rider.updateOne({ _id: rider._id }, { $set: set });
        const riderId = String(socket.user._id);
        await redisHSet(`presence:rider:${riderId}`, {
          isOnline: "1",
          status: String(set.status || rider.status || "ONLINE_AVAILABLE"),
          lastSeen: String(Date.now()),
        });
        await redisExpire(`presence:rider:${riderId}`, 120);
        await redisSAdd(`socket:rider:${riderId}`, socket.id);
        await redisSet(`rider:socket:${socket.id}`, riderId, 3600);

        scheduleRiderHeartbeatTimeout({
          riderUserId: socket.user._id,
          socketId: socket.id,
        });
      } catch (err) {
        console.error("Error processing rider heartbeat:", err);
      }
    });

    socket.on("rider:offline", async ({ reason } = {}) => {
      if (!isRider(socket)) return;
      clearRiderHeartbeatTimeout(socket.user._id);
      await markRiderOffline({
        riderUserId: socket.user._id,
        socketId: socket.id,
        reason: reason || "CLIENT_OFFLINE",
      });
    });

    socket.on("rider:location", async ({ orderId, lat, lng }) => {
      if (!isRider(socket)) return;

      const location = parseLocationPayload({ lat, lng });
      if (!location) return;

      try {
        const update = {
          location,
          lastSeen: new Date(),
          isOnline: true,
          socketId: socket.id,
        };
        if (orderId) {
          update.status = "ONLINE_BUSY";
          update.isAvailable = false;
        }
        await Rider.findOneAndUpdate({ userId: socket.user._id }, update);
        const riderId = String(socket.user._id);
        await redisHSet(`presence:rider:${riderId}`, {
          isOnline: "1",
          status: String(update.status || "ONLINE_AVAILABLE"),
          lastSeen: String(Date.now()),
        });
        await redisExpire(`presence:rider:${riderId}`, 120);
        await redisSAdd(`socket:rider:${riderId}`, socket.id);
        await redisSet(`rider:socket:${socket.id}`, riderId, 3600);

        scheduleRiderHeartbeatTimeout({
          riderUserId: socket.user._id,
          socketId: socket.id,
        });
      } catch (err) {
        console.error("Error updating rider loc:", err);
      }

      if (orderId) {
        io.to(`order:${orderId}`).emit("rider:location:update", {
          lat,
          lng,
          riderId: socket.user._id,
        });
      }
    });

    socket.on("user:location", async ({ orderId, lat, lng }) => {
      if (!socket.user) return;
      if (String(socket.user.role || "").toLowerCase() !== "user") return;
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

    socket.on("rider:accept", async ({ orderId }) => {
      console.log(`Socket: Rider ${socket.user?.name || "unknown"} accepted order ${orderId}`);
    });

    socket.on("rider:reject", async ({ orderId }) => {
      console.log(`Socket: Rider ${socket.user?.name || "unknown"} rejected order ${orderId}`);
    });

    socket.on("order:delivered", async ({ orderId }) => {
      if (!isRider(socket)) return;

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
      if (!isRider(socket)) return;
      await markRiderOffline({
        riderUserId: socket.user._id,
        socketId: socket.id,
        reason: "SOCKET_DISCONNECT",
      });
    });
  });
}
