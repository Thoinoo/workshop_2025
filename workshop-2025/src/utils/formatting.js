export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export const formatOrdinal = (rank) => {
  if (!Number.isFinite(rank) || rank <= 0) {
    return "--";
  }
  const value = Math.floor(rank);
  const suffix = value % 100 >= 11 && value % 100 <= 13
    ? "th"
    : value % 10 === 1
    ? "st"
    : value % 10 === 2
    ? "nd"
    : value % 10 === 3
    ? "rd"
    : "th";
  return `${value}${suffix}`;
};
