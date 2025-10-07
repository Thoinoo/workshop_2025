const STORAGE_KEY = "enigmesProgress";
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

export const getEnigmesProgress = () => {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const writeProgress = (progress) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn("[enigmesProgress] Failed to persist progress", error);
  }
};

export const setEnigmeStatus = (key, completed) => {
  if (typeof window === "undefined") return;

  const current = getEnigmesProgress();
  const normalized = Boolean(completed);

  if (current[key] === normalized) {
    return;
  }

  const progress = { ...current, [key]: normalized };
  writeProgress(progress);
  window.dispatchEvent(
    new CustomEvent(ENIGMES_PROGRESS_EVENT, { detail: { key, completed: normalized } })
  );
};
