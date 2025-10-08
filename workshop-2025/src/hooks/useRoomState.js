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
  missionFailed: "missionFailed",
  avatar: "avatar",
  leaderboardEntry: "leaderboardEntry",
};

const REQUIRED_ENIGMES = ["enigme1", "enigme2", "enigme3", "enigme4"];

let lastDefeatRedirectSource = null;
const readBoolean = (key, fallback = false) => sessionStorage.getItem(key) === "true" || fallback;

export default function useRoomState() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username] = useState(() => sessionStorage.getItem(STORAGE_KEYS.pseudo) || "");
  const [room] = useState(() => sessionStorage.getItem(STORAGE_KEYS.room) || "");
  const [isHost] = useState(() => readBoolean(STORAGE_KEYS.isHost));
  const [avatar, setAvatar] = useState(() => sessionStorage.getItem(STORAGE_KEYS.avatar) || "");
  const [latestLeaderboardEntry, setLatestLeaderboardEntry] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.leaderboardEntry);
    if (!stored) {
      return null;
    }
    try {
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  });
  const [missionStarted, setMissionStarted] = useState(() =>
    readBoolean(STORAGE_KEYS.missionStarted, false)
  );
  const [missionCompleted, setMissionCompleted] = useState(() =>
    readBoolean(STORAGE_KEYS.missionCompleted, false)
  );
  const [missionFailed, setMissionFailed] = useState(() =>
    readBoolean(STORAGE_KEYS.missionFailed, false)
  );
  const [missionElapsedSeconds, setMissionElapsedSeconds] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.missionElapsedSeconds);
    return stored ? Number(stored) : null;
  });
  const [enigmesProgressState, setEnigmesProgressState] = useState(() =>
    getEnigmesProgress(sessionStorage.getItem(STORAGE_KEYS.room) || "")
  );
  const [toolsState, setToolsState] = useState({});

  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [timerRemaining, setTimerRemaining] = useState(null);

  const currentScene = useMemo(() => {
    const pathname = location.pathname || "";
    const enigmeMatch = pathname.match(/^\/enigme(\d+)/);
    if (enigmeMatch) {
      return `enigme${enigmeMatch[1]}`;
    }
    return null;
  }, [location.pathname]);

  const persistLeaderboardEntry = useCallback((entry) => {
    if (!entry || typeof entry !== "object") {
      sessionStorage.removeItem(STORAGE_KEYS.leaderboardEntry);
      setLatestLeaderboardEntry(null);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEYS.leaderboardEntry, JSON.stringify(entry));
    } catch {
      // ignore storage quota issues
    }
    setLatestLeaderboardEntry(entry);
  }, []);

  const recordMissionFailure = useCallback(
    (elapsedSeconds = null) => {
      let normalizedElapsed = null;
      if (Number.isFinite(elapsedSeconds)) {
        normalizedElapsed = Math.max(0, Math.round(Number(elapsedSeconds)));
      } else {
        const startTsRaw = sessionStorage.getItem(STORAGE_KEYS.missionStartTimestamp);
        const startTs = startTsRaw ? Number(startTsRaw) : null;
        if (Number.isFinite(startTs)) {
          normalizedElapsed = Math.max(0, Math.round((Date.now() - startTs) / 1000));
        }
      }

      if (Number.isFinite(normalizedElapsed)) {
        sessionStorage.setItem(STORAGE_KEYS.missionElapsedSeconds, String(normalizedElapsed));
        setMissionElapsedSeconds(normalizedElapsed);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
        setMissionElapsedSeconds(null);
      }

      sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
      setMissionStarted(false);
      sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
      setMissionCompleted(false);
      sessionStorage.setItem(STORAGE_KEYS.missionFailed, "true");
      setMissionFailed(true);
      sessionStorage.removeItem(STORAGE_KEYS.missionStartTimestamp);
      persistLeaderboardEntry(null);
    },
    [persistLeaderboardEntry]
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.missionStarted, missionStarted ? "true" : "false");
  }, [missionStarted]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.missionFailed, missionFailed ? "true" : "false");
  }, [missionFailed]);

  useEffect(() => {
    if (!room || !username) {
      return;
    }
    socket.emit("playerSceneUpdate", {
      room,
      username,
      scene: currentScene,
    });
  }, [currentScene, room, username]);

  useEffect(() => {
    if (!username || !room) {
      navigate("/");
      return () => {};
    }

    const handlePlayersUpdate = (updatedPlayers) => {
      if (!Array.isArray(updatedPlayers)) {
        setPlayers([]);
        return;
      }
      setPlayers(
        updatedPlayers.map((player) => {
          if (typeof player === "object" && player) {
            return {
              username: player.username,
              avatar: player.avatar ?? null,
              scene: player.scene ?? null,
            };
          }
          return {
            username: String(player || ""),
            avatar: null,
            scene: null,
          };
        })
      );
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
      sessionStorage.setItem(STORAGE_KEYS.missionFailed, "false");
      setMissionFailed(false);
      persistLeaderboardEntry(null);
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
      sessionStorage.setItem(STORAGE_KEYS.missionFailed, "false");
      setMissionFailed(false);
      setMissionElapsedSeconds(null);
      persistLeaderboardEntry(null);
      setToolsState({});
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

    const handleLeaderboardEntryRecorded = (payload = {}) => {
      if (payload === null) {
        persistLeaderboardEntry(null);
        return;
      }
      const entry =
        payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "entry")
          ? payload.entry
          : payload;
      if (entry && typeof entry === "object") {
        persistLeaderboardEntry(entry);
      }
    };

    const handleToolsUpdate = (payload = {}) => {
      const normalized = payload && typeof payload === "object" ? payload : {};
      setToolsState(normalized);
    };

    setPlayers([]);
    setChat([]);
    setTimerRemaining(null);
    setEnigmesProgressState(getEnigmesProgress(room));
    setToolsState({});

    socket.emit("joinRoom", { username, room, avatar }, (initialState = {}) => {
      if (Array.isArray(initialState.players)) {
        handlePlayersUpdate(initialState.players);
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
      if (initialState.tools && typeof initialState.tools === "object") {
        setToolsState({ ...initialState.tools });
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
    socket.on("leaderboardEntryRecorded", handleLeaderboardEntryRecorded);
    socket.on("toolsUpdate", handleToolsUpdate);

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
      socket.off("leaderboardEntryRecorded", handleLeaderboardEntryRecorded);
      socket.off("toolsUpdate", handleToolsUpdate);
    };
  }, [navigate, persistLeaderboardEntry, room, username]);

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
    sessionStorage.setItem(STORAGE_KEYS.missionFailed, "false");
    sessionStorage.setItem(STORAGE_KEYS.missionStartTimestamp, Date.now().toString());
    sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
    setMissionStarted(true);
    setMissionCompleted(false);
    setMissionFailed(false);
    setMissionElapsedSeconds(null);
    persistLeaderboardEntry(null);
    socket.emit("startMission", { room });
  }, [persistLeaderboardEntry, room]);

  const resetMission = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
    setMissionStarted(false);
    clearEnigmesProgress(room);
    setEnigmesProgressState({});
    sessionStorage.removeItem(STORAGE_KEYS.missionStartTimestamp);
    sessionStorage.removeItem(STORAGE_KEYS.missionElapsedSeconds);
    sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
    setMissionCompleted(false);
    sessionStorage.setItem(STORAGE_KEYS.missionFailed, "false");
    setMissionFailed(false);
    setMissionElapsedSeconds(null);
    persistLeaderboardEntry(null);
    if (room) {
      socket.emit("resetMission", { room });
    }
  }, [persistLeaderboardEntry, room]);

  const updateAvatar = useCallback(
    (avatarId) => {
      if (!username || !room) {
        return;
      }
      const trimmed = typeof avatarId === "string" ? avatarId.trim() : "";
      sessionStorage.setItem(STORAGE_KEYS.avatar, trimmed);
      setAvatar(trimmed);
      setPlayers((current) => {
        const hasPlayer = current.some((player) => player.username === username);
        if (!hasPlayer) {
          return [...current, { username, avatar: trimmed || null }];
        }
        return current.map((player) =>
          player.username === username ? { ...player, avatar: trimmed || null } : player
        );
      });
      socket.emit("avatarUpdate", { room, username, avatar: trimmed || null });
    },
    [room, username]
  );

  const useFileFixer = useCallback(
    (content) =>
      new Promise((resolve) => {
        if (!room) {
          resolve({ ok: false, error: "missing_room" });
          return;
        }

        socket.emit(
          "tool:fileFixer:repair",
          { room, content: typeof content === "string" ? content : "" },
          (response = {}) => {
            resolve(response);
          }
        );
      }),
    [room]
  );

  const recordLeaderboardEntry = useCallback(
    (entry, { broadcast = false } = {}) => {
      if (!entry || typeof entry !== "object") {
        persistLeaderboardEntry(null);
        if (broadcast && room) {
          socket.emit("leaderboardEntryRecorded", { room, entry: null });
        }
        return;
      }
      const normalizedEntry = {
        ...entry,
        players: Array.isArray(entry.players) ? entry.players : [],
      };
      persistLeaderboardEntry(normalizedEntry);
      if (broadcast && room) {
        socket.emit("leaderboardEntryRecorded", { room, entry: normalizedEntry });
      }
    },
    [persistLeaderboardEntry, room]
  );

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
    if (!missionStarted || missionCompleted || missionFailed) {
      return;
    }
    if (!Number.isFinite(timerRemaining)) {
      return;
    }
    if (timerRemaining > 0.05) {
      return;
    }

    const startTsRaw = sessionStorage.getItem(STORAGE_KEYS.missionStartTimestamp);
    const startTs = startTsRaw ? Number(startTsRaw) : null;
    if (Number.isFinite(startTs)) {
      const elapsed = Math.max(0, Math.round((Date.now() - startTs) / 1000));
      sessionStorage.setItem(STORAGE_KEYS.missionElapsedSeconds, String(elapsed));
      setMissionElapsedSeconds(elapsed);
    }
    sessionStorage.setItem(STORAGE_KEYS.missionCompleted, "false");
    setMissionCompleted(false);
    sessionStorage.setItem(STORAGE_KEYS.missionFailed, "true");
    setMissionFailed(true);
    sessionStorage.setItem(STORAGE_KEYS.missionStarted, "false");
    setMissionStarted(false);
    persistLeaderboardEntry(null);
  }, [
    missionStarted,
    missionCompleted,
    missionFailed,
    timerRemaining,
    persistLeaderboardEntry,
  ]);

  useEffect(() => {
    if (!missionFailed) {
      lastDefeatRedirectSource = null;
      return;
    }
    if (location.pathname === "/defaite") {
      lastDefeatRedirectSource = null;
      return;
    }
    if (lastDefeatRedirectSource === location.pathname) {
      return;
    }
    lastDefeatRedirectSource = location.pathname;
    Promise.resolve().then(() => {
      navigate("/defaite", { replace: true });
    });
  }, [location.pathname, missionFailed, navigate]);

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
      missionFailed,
      missionElapsedSeconds,
      avatar,
      updateAvatar,
      latestLeaderboardEntry,
      recordLeaderboardEntry,
      tools: toolsState,
      useFileFixer,
      currentScene,
    }),
    [
      allEnigmesCompleted,
      chat,
      completedEnigmesCount,
      latestLeaderboardEntry,
      enigmesProgressState,
      isHost,
      missionCompleted,
      missionFailed,
      missionElapsedSeconds,
      missionStarted,
      players,
      resetMission,
      room,
      recordLeaderboardEntry,
      toolsState,
      sendMessage,
      startMission,
      timerRemaining,
      username,
      avatar,
      updateAvatar,
      useFileFixer,
      currentScene,
    ]
  );

  return value;
}
