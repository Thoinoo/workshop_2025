import { useEffect, useMemo, useState } from "react";
import {
  ENIGMES_PROGRESS_EVENT,
  getEnigmesProgress,
  getStorageKeyForRoom,
} from "../utils/enigmesProgress";

const resolveRoom = (room) => {
  if (typeof room === "string" && room.trim()) {
    return room.trim();
  }

  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("room");
    if (stored && stored.trim()) {
      return stored.trim();
    }
  }

  return null;
};

export default function useEnigmeCompletion(enigmeKey, room) {
  const resolvedRoom = useMemo(() => resolveRoom(room), [room]);
  const [completed, setCompleted] = useState(() =>
    Boolean(getEnigmesProgress(resolvedRoom)?.[enigmeKey])
  );

  useEffect(() => {
    setCompleted(Boolean(getEnigmesProgress(resolvedRoom)?.[enigmeKey]));
  }, [resolvedRoom, enigmeKey]);

  useEffect(() => {
    if (!resolvedRoom) {
      return () => {};
    }

    const updateFromStorage = () => {
      setCompleted(Boolean(getEnigmesProgress(resolvedRoom)?.[enigmeKey]));
    };

    const handleProgressEvent = (event) => {
      if (event?.detail?.room && event.detail.room !== resolvedRoom) {
        return;
      }

      if (event?.detail?.progress) {
        setCompleted(Boolean(event.detail.progress?.[enigmeKey]));
      } else {
        updateFromStorage();
      }
    };

    const handleStorageEvent = (event) => {
      if (event.key && event.key === getStorageKeyForRoom(resolvedRoom)) {
        updateFromStorage();
      }
    };

    window.addEventListener(ENIGMES_PROGRESS_EVENT, handleProgressEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(ENIGMES_PROGRESS_EVENT, handleProgressEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [resolvedRoom, enigmeKey]);

  return completed;
}
