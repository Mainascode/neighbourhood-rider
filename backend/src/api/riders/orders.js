import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { ORDER_STATUS, updateOrderStatus } from "../../lib/orderStatus.js";
import { sendNotification } from "../../lib/notificationService.js";
import { isRuakaLaunchModeEnabled } from "../../lib/launchMode.js";

async function getAssignedRider(userId) {
  return Rider.findOne({ userId }).select("_id name userId status currentOrders isAvailable");
}

function buildClientMessage(type, riderName) {
  if (type === "accepted") {
    return {
      title: "Rider accepted your order",
      body: `${riderName || "Your rider"} has accepted your delivery request.`,
      eventType: "RIDER_ACCEPTED_ORDER",
    };
  }

  return {
    title: "Rider declined your order",
    body: `${riderName || "Your rider"} could not take the request. We are notifying you immediately while we look for another option.`,
    eventType: "RIDER_REJECTED_ORDER",
  };
}

/**
 * POST /api/riders/accept-order
 * Body: { orderId }
 */
export async function acceptOrder(req, res) {
  try {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const rider = await getAssignedRider(req.user?._id);
    if (!rider) {
      return res.status(403).json({ error: "Rider profile not found" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.riderId || "") !== String(rider._id)) {
      return res.status(403).json({ error: "This order is not assigned to you" });
    }

    if (order.riderResponseStatus === "ACCEPTED") {
      return res.json({ success: true, message: "Order already accepted" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          riderResponseStatus: "ACCEPTED",
          riderAcceptedAt: new Date(),
          riderRejectedAt: null,
          riderRejectionReason: "",
          statusUpdatedAt: new Date(),
        },
      },
      { new: true }
    );

    const clientMessage = buildClientMessage("accepted", rider.name);
    await sendNotification({
      recipientId: updatedOrder.userId,
      recipientType: "USER",
      title: clientMessage.title,
      body: clientMessage.body,
      data: {
        orderId: String(updatedOrder._id),
        riderId: String(rider._id),
        riderName: rider.name || "",
        response: "ACCEPTED",
      },
      eventType: clientMessage.eventType,
      deepLink: "/orders",
      orderId: String(updatedOrder._id),
      category: "orderUpdates",
      io: req.app.get("io"),
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`rider:${req.user._id}`).emit("rider:order_response", {
        orderId: String(updatedOrder._id),
        response: "ACCEPTED",
      });
      io.to(`order:${updatedOrder._id}`).emit("order:rider_response", {
        orderId: String(updatedOrder._id),
        response: "ACCEPTED",
        riderName: rider.name || "",
        respondedAt: updatedOrder.riderAcceptedAt,
      });
    }

    return res.json({
      success: true,
      message: "Order accepted successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Accept order error:", err);
    return res.status(500).json({ error: "Failed to accept order" });
  }
}

/**
 * POST /api/riders/reject-order
 * Body: { orderId, reason? }
 */
export async function rejectOrder(req, res) {
  try {
    const { orderId, reason = "" } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const rider = await getAssignedRider(req.user?._id);
    if (!rider) {
      return res.status(403).json({ error: "Rider profile not found" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.riderId || "") !== String(rider._id)) {
      return res.status(403).json({ error: "This order is not assigned to you" });
    }

    const launchMode = isRuakaLaunchModeEnabled();
    const fallbackStatus = launchMode ? ORDER_STATUS.PENDING_RIDER : ORDER_STATUS.READY_FOR_PICKUP;

    const updatedOrder = await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: order.status,
      toStatus: fallbackStatus,
      actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
      source: "riders.reject-order",
      reason: String(reason || "").trim() || "RIDER_DECLINED",
      io: req.app.get("io"),
      set: {
        riderId: null,
        riderResponseStatus: "REJECTED",
        riderRejectedAt: new Date(),
        riderAcceptedAt: null,
        riderRejectionReason: String(reason || "").trim(),
      },
    });

    await Rider.findByIdAndUpdate(rider._id, {
      $set: {
        status: "ONLINE_AVAILABLE",
        isAvailable: true,
        currentOrders: 0,
      },
      $inc: {
        "penalties.rejectionCount": 1,
      },
    });

    const clientMessage = buildClientMessage("rejected", rider.name);
    await sendNotification({
      recipientId: updatedOrder.userId,
      recipientType: "USER",
      title: clientMessage.title,
      body: clientMessage.body,
      data: {
        orderId: String(updatedOrder._id),
        riderId: String(rider._id),
        riderName: rider.name || "",
        response: "REJECTED",
        reason: String(reason || "").trim(),
      },
      eventType: clientMessage.eventType,
      deepLink: "/orders",
      orderId: String(updatedOrder._id),
      category: "orderUpdates",
      io: req.app.get("io"),
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`rider:${req.user._id}`).emit("rider:order_response", {
        orderId: String(updatedOrder._id),
        response: "REJECTED",
      });
      io.to(`order:${updatedOrder._id}`).emit("order:rider_response", {
        orderId: String(updatedOrder._id),
        response: "REJECTED",
        riderName: rider.name || "",
        reason: String(reason || "").trim(),
        respondedAt: updatedOrder.riderRejectedAt,
      });
    }

    if (!launchMode) {
      const { matchOrder } = await import("../../services/matching.js");
      const pickup = {
        lat: updatedOrder.pickup?.location?.coordinates?.[1],
        lng: updatedOrder.pickup?.location?.coordinates?.[0],
      };

      if (Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng)) {
        matchOrder(
          String(updatedOrder._id),
          pickup,
          1,
          [String(rider._id)],
          req.app.get("io"),
          Date.now()
        );
      }
    }

    return res.json({
      success: true,
      message: "Order rejected successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Reject order error:", err);
    return res.status(500).json({ error: "Failed to reject order" });
  }
}
