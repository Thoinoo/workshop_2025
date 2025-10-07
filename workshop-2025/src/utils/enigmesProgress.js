const STORAGE_PREFIX = "enigmesProgress::";
export const ENIGMES_PROGRESS_EVENT = "enigmesProgressUpdated";

const safeParse = (raw) => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[enigmesProgress] Failed to parse progress", error);
    return {};
  }
};

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

export const getStorageKeyForRoom = (room) => {
  const resolved = resolveRoom(room);
  return resolved ? `${STORAGE_PREFIX}${resolved}` : null;
};

const readProgress = (room) => {
  if (typeof window === "undefined") {
    return {};
  }

  const storageKey = getStorageKeyForRoom(room);
  if (!storageKey) {
    return {};
  }

  return safeParse(window.localStorage.getItem(storageKey));
};

const writeProgress = (room, progress) => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getStorageKeyForRoom(room);
  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch (error) {
    console.warn("[enigmesProgress] Failed to persist progress", error);
  }
};

export const getEnigmesProgress = (room) => readProgress(room);

export const setEnigmesProgress = (room, progress = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  const resolved = resolveRoom(room);
  if (!resolved) {
    return;
  }

  const normalizedProgress =
    progress && typeof progress === "object" ? { ...progress } : {};

  writeProgress(resolved, normalizedProgress);
  window.dispatchEvent(
    new CustomEvent(ENIGMES_PROGRESS_EVENT, {
      detail: { room: resolved, progress: normalizedProgress },
    })
  );
};

export const setEnigmeStatus = (room, key, completed) => {
  if (typeof window === "undefined") {
    return;
  }

  const resolved = resolveRoom(room);
  const normalizedKey = typeof key === "string" ? key.trim() : "";
  if (!resolved || !normalizedKey) {
    return;
  }

  const current = readProgress(resolved);
  const normalized = Boolean(completed);

  if (current[normalizedKey] === normalized) {
    return;
  }

  const progress = { ...current, [normalizedKey]: normalized };
  setEnigmesProgress(resolved, progress);
};

export const clearEnigmesProgress = (room) => {
  if (typeof window === "undefined") {
    return;
  }

  const resolved = resolveRoom(room);
  if (!resolved) {
    return;
  }

  setEnigmesProgress(resolved, {});
};
