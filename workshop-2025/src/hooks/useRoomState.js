import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

export default function useRoomState() {
  const navigate = useNavigate();
  const [username] = useState(() => sessionStorage.getItem("pseudo") || "");
  const [room] = useState(() => sessionStorage.getItem("room") || "");

  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [timerRemaining, setTimerRemaining] = useState(null);

  useEffect(() => {
    if (!username || !room) {
      navigate("/");
      return () => {};
    }

    const handlePlayersUpdate = (updatedPlayers) => {
      setPlayers(Array.isArray(updatedPlayers) ? [...updatedPlayers] : []);
    };

    const handleNewMessage = (msg) => {
      setChat((prev) => [...prev, msg]);
    };

    const handleChatHistory = (history) => {
      setChat(Array.isArray(history) ? [...history] : []);
    };

    const handleTimerUpdate = (remaining) => {
      if (typeof remaining === "number") {
        setTimerRemaining(remaining);
      }
    };

    setPlayers([]);
    setChat([]);
    setTimerRemaining(null);

    socket.emit("joinRoom", { username, room }, (initialState = {}) => {
      if (Array.isArray(initialState.players)) {
        setPlayers([...initialState.players]);
      }
      if (Array.isArray(initialState.messages)) {
        setChat([...initialState.messages]);
      }
      if (typeof initialState.timer === "number") {
        setTimerRemaining(initialState.timer);
      }
    });

    socket.on("playersUpdate", handlePlayersUpdate);
    socket.on("newMessage", handleNewMessage);
    socket.on("chatHistory", handleChatHistory);
    socket.on("timerUpdate", handleTimerUpdate);

    return () => {
      socket.off("playersUpdate", handlePlayersUpdate);
      socket.off("newMessage", handleNewMessage);
      socket.off("chatHistory", handleChatHistory);
      socket.off("timerUpdate", handleTimerUpdate);
    };
  }, [navigate, room, username]);

  const sendMessage = useCallback(
    (content) => {
      const trimmed = content.trim();
      if (!trimmed || !username || !room) {
        return;
      }

      socket.emit("chatMessage", { room, username, message: trimmed });
    },
    [room, username]
  );

  return { username, room, players, chat, timerRemaining, sendMessage };
}
