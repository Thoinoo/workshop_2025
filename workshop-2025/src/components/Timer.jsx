import { useEffect, useState } from "react";

export default function Timer({ start = 0 }) {
  const [seconds, setSeconds] = useState(start);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const formattedSeconds = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="game-timer" aria-live="polite">
      <span className="timer-label">Temps écoulé</span>
      <span className="timer-value">{minutes}:{formattedSeconds}</span>
    </div>
  );
}