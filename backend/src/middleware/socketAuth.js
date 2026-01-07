import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Invalid token"));
  }
}
