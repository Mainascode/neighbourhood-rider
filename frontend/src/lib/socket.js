
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_URL || "https://neighbourhood-rider.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
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
