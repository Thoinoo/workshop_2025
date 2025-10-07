import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

const STORAGE_KEYS = {
  missionStarted: "missionStarted",
  pseudo: "pseudo",
  room: "room",
  isHost: "isHost",
};

const readBoolean = (key, fallback = false) => sessionStorage.getItem(key) === "true" || fallback;

export default function useRoomState() {
  const navigate = useNavigate();
  const [username] = useState(() => sessionStorage.getItem(STORAGE_KEYS.pseudo) || "");
  const [room] = useState(() => sessionStorage.getItem(STORAGE_KEYS.room) || "");
  const [isHost] = useState(() => readBoolean(STORAGE_KEYS.isHost));
  const [missionStarted, setMissionStarted] = useState(() =>
    readBoolean(STORAGE_KEYS.missionStarted, false)
  );

  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [timerRemaining, setTimerRemaining] = useState(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.missionStarted, missionStarted ? "true" : "false");
  }, [missionStarted]);

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

    const handleMissionStarted = () => {
      sessionStorage.setItem(STORAGE_KEYS.missionStarted, "true");
      setMissionStarted(true);
    };

    const handleMissionReset = () => {
      sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
      setMissionStarted(false);
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
      if (typeof initialState.missionStarted === "boolean") {
        const started = initialState.missionStarted;
        sessionStorage.setItem(STORAGE_KEYS.missionStarted, started ? "true" : "false");
        setMissionStarted(started);
      }
    });

    socket.on("playersUpdate", handlePlayersUpdate);
    socket.on("newMessage", handleNewMessage);
    socket.on("chatHistory", handleChatHistory);
    socket.on("timerUpdate", handleTimerUpdate);
    socket.on("missionStarted", handleMissionStarted);
    socket.on("missionReset", handleMissionReset);

    return () => {
      socket.off("playersUpdate", handlePlayersUpdate);
      socket.off("newMessage", handleNewMessage);
      socket.off("chatHistory", handleChatHistory);
      socket.off("timerUpdate", handleTimerUpdate);
      socket.off("missionStarted", handleMissionStarted);
      socket.off("missionReset", handleMissionReset);
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

  const startMission = useCallback(() => {
    if (!room) {
      return;
    }

    sessionStorage.setItem(STORAGE_KEYS.missionStarted, "true");
    setMissionStarted(true);
    socket.emit("startMission", { room });
  }, [room]);

  const resetMission = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
    setMissionStarted(false);
    if (room) {
      socket.emit("resetMission", { room });
    }
  }, [room]);

  const value = useMemo(
    () => ({
      username,
      room,
      players,
      chat,
      timerRemaining,
      sendMessage,
      isHost,
      missionStarted,
      startMission,
      resetMission,
    }),
    [
      chat,
      isHost,
      missionStarted,
      players,
      resetMission,
      room,
      sendMessage,
      startMission,
      timerRemaining,
      username,
    ]
  );

  return value;
}
