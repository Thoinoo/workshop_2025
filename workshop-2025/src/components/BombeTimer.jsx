import { useEffect, useState } from "react";
import "./BombeTimer.css";

export default function BombeTimer({ startSeconds = 10 }) {
  const [remaining, setRemaining] = useState(startSeconds);
  const [exploded, setExploded] = useState(false);

  useEffect(() => {
    if (remaining <= 0 || exploded) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExploded(true);
          setTimeout(() => {
            alert("💥 Le temps est écoulé, vous avez perdu !");
          }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, exploded]);

  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className={`bombe ${remaining <= 10 ? "warn" : ""} ${exploded ? "exploded" : ""}`}>
      {!exploded && <div className="spark"></div>}
      <div className="time">{mm}:{ss}</div>
      {exploded && <div className="blast-msg show">💥 BOOM!</div>}
    </div>
  );
}
