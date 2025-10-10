import { io } from "socket.io-client";

const { VITE_SOCKET_URL, VITE_SOCKET_PORT } = import.meta.env;

const resolvedUrl = (() => {
  if (VITE_SOCKET_URL && VITE_SOCKET_URL.trim()) {
    return VITE_SOCKET_URL.trim();
  }

  if (typeof window === "undefined") {
    // défaut côté build/SSR
    return "http://localhost:3000";
  }

  if (VITE_SOCKET_PORT && VITE_SOCKET_PORT.trim()) {
    const port = VITE_SOCKET_PORT.trim();
    return `${window.location.protocol}//${window.location.hostname}${port ? `:${port}` : ""}`;
  }

  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return window.location.origin;
})();

const socket = io(resolvedUrl);

export default socket;
