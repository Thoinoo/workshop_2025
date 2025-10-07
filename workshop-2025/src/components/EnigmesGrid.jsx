import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ENIGMES_PROGRESS_EVENT,
  getEnigmesProgress,
  getStorageKeyForRoom,
} from "../utils/enigmesProgress";

const GRID_ITEMS = [
  { key: "enigme1", label: "Énigme 1", path: "/enigme1" },
  { key: "enigme2", label: "Énigme 2", path: "/enigme2" },
  { key: "enigme3", label: "Énigme 3", path: "/enigme3" },
  { key: "enigme4", label: "Énigme 4", path: "/enigme4" },
  { key: "slot-5", label: "À venir", disabled: true },
  { key: "slot-6", label: "À venir", disabled: true },
  { key: "slot-7", label: "À venir", disabled: true },
  { key: "slot-8", label: "À venir", disabled: true },
  { key: "slot-9", label: "À venir", disabled: true },
];

function GridButtons({ active, onAfterNavigate, completed }) {
  const navigate = useNavigate();
  const completedKeys = completed instanceof Set ? completed : new Set(completed ?? []);

  return (
    <nav aria-label="Navigation entre les énigmes" className="enigmes-grid">
      {GRID_ITEMS.map(({ key, label, path, disabled }) => {
        const isActive = key === active;
        const isCompleted = completedKeys.has(key);

        return (
          <button
            key={key}
            type="button"
            className={[
              "enigmes-grid__item",
              isActive ? "enigmes-grid__item--active" : "",
              isCompleted ? "enigmes-grid__item--completed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              if (!disabled && path) {
                navigate(path);
                onAfterNavigate?.();
              }
            }}
            disabled={disabled || isActive}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

const extractCompletedKeys = (progress = {}) =>
  new Set(
    Object.entries(progress)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
  );

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

export default function EnigmesGridMenu({ active, room }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const resolvedRoom = useMemo(() => resolveRoom(room), [room]);
  const [completedKeys, setCompletedKeys] = useState(() =>
    extractCompletedKeys(getEnigmesProgress(resolvedRoom))
  );

  useEffect(() => {
    setCompletedKeys(extractCompletedKeys(getEnigmesProgress(resolvedRoom)));
  }, [resolvedRoom]);

  useEffect(() => {
    if (!resolvedRoom) {
      return () => {};
    }

    const updateFromStorage = () => {
      setCompletedKeys(extractCompletedKeys(getEnigmesProgress(resolvedRoom)));
    };

    const handleProgressEvent = (event) => {
      if (event?.detail?.room && event.detail.room !== resolvedRoom) {
        return;
      }
      if (event?.detail?.room === resolvedRoom) {
        setCompletedKeys(extractCompletedKeys(event.detail.progress));
      } else {
        updateFromStorage();
      }
    };

    window.addEventListener(ENIGMES_PROGRESS_EVENT, handleProgressEvent);
    const storageListener = (event) => {
      if (event.key && event.key === getStorageKeyForRoom(resolvedRoom)) {
        updateFromStorage();
      }
    };
    window.addEventListener("storage", storageListener);

    return () => {
      window.removeEventListener(ENIGMES_PROGRESS_EVENT, handleProgressEvent);
      window.removeEventListener("storage", storageListener);
    };
  }, [resolvedRoom]);

  useEffect(() => {
    setIsOpen(false);
  }, [active]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!isOpen) return;
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={["enigmes-menu", isOpen ? "enigmes-menu--open" : ""].join(" ").trim()}
    >
      <button
        type="button"
        className="enigmes-menu__toggle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="enigmes-menu__icon" aria-hidden="true">
          {GRID_ITEMS.map(({ key }) => (
            <span key={key} />
          ))}
        </span>
        <span className="enigmes-menu__label">Sélection des énigmes</span>
      </button>

      <div className="enigmes-menu__panel">
        <GridButtons
          active={active}
          onAfterNavigate={() => setIsOpen(false)}
          completed={completedKeys}
        />
      </div>
    </div>
  );
}
