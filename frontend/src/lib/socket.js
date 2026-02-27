
import { io } from "socket.io-client";

const REMOTE_SOCKET_URL = "https://neighbourhood-rider.onrender.com";

const SOCKET_URL =
  process.env.REACT_APP_API_URL || REMOTE_SOCKET_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  path: "/socket.io",
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
