import { io } from "socket.io-client";

const { VITE_SOCKET_URL, VITE_SOCKET_PORT } = import.meta.env;

const resolvedUrl = (() => {
  if (VITE_SOCKET_URL && VITE_SOCKET_URL.trim()) {
    return VITE_SOCKET_URL.trim();
  }

  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = VITE_SOCKET_PORT || "3000";

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
})();

const socket = io(resolvedUrl);

export default socket;
