
import { io } from "socket.io-client";

const REMOTE_SOCKET_URL = "https://neighbourhood-rider.onrender.com";

const SOCKET_URL =
  process.env.REACT_APP_API_URL || REMOTE_SOCKET_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  path: "/socket.io",
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

/**
 * Call this AFTER login
 */
export const connectSocket = (token) => {
  if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }
};

/**
 * Call this on logout
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const emitRiderOnline = (payload = {}) => {
  if (socket.connected) {
    socket.emit("rider:online", payload);
  }
};

export const emitRiderHeartbeat = (payload = {}) => {
  if (socket.connected) {
    socket.emit("rider:heartbeat", payload);
  }
};

export const emitRiderOffline = (reason = "CLIENT_OFFLINE") => {
  if (socket.connected) {
    socket.emit("rider:offline", { reason });
  }
};
