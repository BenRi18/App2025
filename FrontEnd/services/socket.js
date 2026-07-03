// FrontEnd/services/socket.js
// Socket.io client singleton — one connection for the whole app lifetime.
//
// Usage:
//   import { connectSocket, getSocket, disconnectSocket } from "../services/socket";
//   connectSocket(token);                     // call after login
//   const socket = getSocket();
//   socket.emit("join_match", matchId);
//   socket.on("message", handler);
//   disconnectSocket();                        // call on logout

import { io } from "socket.io-client";
import { API_URL } from "./api";

let _socket = null;

export function connectSocket(token) {
  if (_socket?.connected) return _socket;

  // Disconnect stale socket before reconnecting
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(API_URL, {
    auth:               { token },
    transports:         ["websocket"],
    reconnection:       true,
    reconnectionAttempts: 5,
    reconnectionDelay:  1500,
    timeout:            10000,
  });

  _socket.on("connect",       () => console.log("🔌 Socket connected:", _socket.id));
  _socket.on("disconnect",    (r) => console.log("🔌 Socket disconnected:", r));
  _socket.on("connect_error", (e) => console.warn("🔌 Socket error:", e.message));

  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

export function getSocket() {
  return _socket;
}
