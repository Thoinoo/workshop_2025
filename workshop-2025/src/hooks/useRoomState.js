import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import {
  clearEnigmesProgress,
  getEnigmesProgress,
  setEnigmeStatus,
  setEnigmesProgress,
} from "../utils/enigmesProgress";

const STORAGE_KEYS = {
  missionStarted: "missionStarted",
  pseudo: "pseudo",
  room: "room",
  isHost: "isHost",
  missionStartTimestamp: "missionStartTimestamp",
  missionElapsedSeconds: "missionElapsedSeconds",
  missionCompleted: "missionCompleted",
};

const REQUIRED_ENIGMES = ["enigme1", "enigme2", "enigme3", "enigme4"];

const readBoolean = (key, fallback = false) => sessionStorage.getItem(key) === "true" || fallback;

export default function useRoomState() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username] = useState(() => sessionStorage.getItem(STORAGE_KEYS.pseudo) || "");
  const [room] = useState(() => sessionStorage.getItem(STORAGE_KEYS.room) || "");
  const [isHost] = useState(() => readBoolean(STORAGE_KEYS.isHost));
  const [missionStarted, setMissionStarted] = useState(() =>
    readBoolean(STORAGE_KEYS.missionStarted, false)
  );
  const [missionCompleted, setMissionCompleted] = useState(() =>
    readBoolean(STORAGE_KEYS.missionCompleted, false)
  );
  const [missionElapsedSeconds, setMissionElapsedSeconds] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.missionElapsedSeconds);
    return stored ? Number(stored) : null;
  });
  const [enigmesProgressState, setEnigmesProgressState] = useState(() =>
    getEnigmesProgress(sessionStorage.getItem(STORAGE_KEYS.room) || "")
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
      sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
      setMissionCompleted(false);
      if (!sessionStorage.getItem(STORAGE_KEYS.missionStartTimestamp)) {
        sessionStorage.setItem(STORAGE_KEYS.missionStartTimestamp, Date.now().toString());
      }
      sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
      setMissionElapsedSeconds(null);
    };

    const handleMissionReset = () => {
      sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
      setMissionStarted(false);
      clearEnigmesProgress(room);
      setEnigmesProgressState({});
      sessionStorage.removeItem(STORAGE_KEYS.missionStartTimestamp);
      sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
      sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
      setMissionCompleted(false);
      setMissionElapsedSeconds(null);
    };

    const handleEnigmeStatusUpdate = (payload = {}) => {
      const { key, completed } = payload ?? {};
      if (typeof key !== "string" || !key) {
        return;
      }
      const normalized = Boolean(completed);
      setEnigmeStatus(room, key, normalized);
      setEnigmesProgressState((current) => ({
        ...(current && typeof current === "object" ? current : {}),
        [key]: normalized,
      }));
    };

    const handleEnigmesProgressSync = (progress = {}) => {
      const normalized = progress && typeof progress === "object" ? progress : {};
      setEnigmesProgress(room, normalized);
      setEnigmesProgressState(normalized);
    };

    setPlayers([]);
    setChat([]);
    setTimerRemaining(null);
    setEnigmesProgressState(getEnigmesProgress(room));

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
        if (started && !sessionStorage.getItem(STORAGE_KEYS.missionStartTimestamp)) {
          sessionStorage.setItem(STORAGE_KEYS.missionStartTimestamp, Date.now().toString());
        }
      }
      if (initialState.enigmes && typeof initialState.enigmes === "object") {
        setEnigmesProgress(room, initialState.enigmes);
        setEnigmesProgressState(initialState.enigmes);
      } else {
        clearEnigmesProgress(room);
        setEnigmesProgressState({});
      }
    });

    socket.on("playersUpdate", handlePlayersUpdate);
    socket.on("newMessage", handleNewMessage);
    socket.on("chatHistory", handleChatHistory);
    socket.on("timerUpdate", handleTimerUpdate);
    socket.on("missionStarted", handleMissionStarted);
    socket.on("startMission", handleMissionStarted);
    socket.on("missionReset", handleMissionReset);
    socket.on("enigmeStatusUpdate", handleEnigmeStatusUpdate);
    socket.on("enigmesProgressSync", handleEnigmesProgressSync);

    return () => {
      socket.off("playersUpdate", handlePlayersUpdate);
      socket.off("newMessage", handleNewMessage);
      socket.off("chatHistory", handleChatHistory);
      socket.off("timerUpdate", handleTimerUpdate);
      socket.off("missionStarted", handleMissionStarted);
      socket.off("startMission", handleMissionStarted);
      socket.off("missionReset", handleMissionReset);
      socket.off("enigmeStatusUpdate", handleEnigmeStatusUpdate);
      socket.off("enigmesProgressSync", handleEnigmesProgressSync);
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
    sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
    sessionStorage.setItem(STORAGE_KEYS.missionStartTimestamp, Date.now().toString());
    sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
    setMissionStarted(true);
    setMissionCompleted(false);
    setMissionElapsedSeconds(null);
    socket.emit("startMission", { room });
  }, [room]);

  const resetMission = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
    setMissionStarted(false);
    clearEnigmesProgress(room);
    setEnigmesProgressState({});
    sessionStorage.removeItem(STORAGE_KEYS.missionStartTimestamp);
    sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
    sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
    setMissionCompleted(false);
    setMissionElapsedSeconds(null);
    if (room) {
      socket.emit("resetMission", { room });
    }
  }, [room]);

  const completedEnigmesCount = useMemo(
    () =>
      REQUIRED_ENIGMES.filter((key) => Boolean(enigmesProgressState && enigmesProgressState[key]))
        .length,
    [enigmesProgressState]
  );

  const allEnigmesCompleted = useMemo(
    () => completedEnigmesCount >= REQUIRED_ENIGMES.length && REQUIRED_ENIGMES.length > 0,
    [completedEnigmesCount]
  );

  useEffect(() => {
    if (!missionStarted || !room) {
      return;
    }
    if (!allEnigmesCompleted) {
      return;
    }
    if (!missionCompleted) {
      const startTsRaw = sessionStorage.getItem(STORAGE_KEYS.missionStartTimestamp);
      const startTs = startTsRaw ? Number(startTsRaw) : Date.now();
      const elapsed = Math.max(0, Math.round((Date.now() - startTs) / 1000));
      sessionStorage.setItem(STORAGE_KEYS.missionElapsedSeconds, String(elapsed));
      sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "true");
      setMissionElapsedSeconds(elapsed);
      setMissionCompleted(true);
    }
    if (location.pathname !== "/victoire") {
      navigate("/victoire", { replace: true });
    }
  }, [
    allEnigmesCompleted,
    location.pathname,
    missionCompleted,
    missionStarted,
    navigate,
    room,
  ]);

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
      enigmesProgress: enigmesProgressState,
      completedEnigmesCount,
      allEnigmesCompleted,
      missionCompleted,
      missionElapsedSeconds,
    }),
    [
      allEnigmesCompleted,
      chat,
      completedEnigmesCount,
      enigmesProgressState,
      isHost,
      missionCompleted,
      missionElapsedSeconds,
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
