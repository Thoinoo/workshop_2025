import { useEffect, useRef, useState } from "react";
import "./BombeTimer.css";

export default function BombeTimer({ remainingSeconds = null }) {
  const [exploded, setExploded] = useState(false);
  const alertShownRef = useRef(false);

  useEffect(() => {
    if (typeof remainingSeconds !== "number") {
      setExploded(false);
      alertShownRef.current = false;
      return;
    }

    if (remainingSeconds <= 0) {
      setExploded(true);

      if (!alertShownRef.current) {
        alertShownRef.current = true;
        setTimeout(() => {
          alert("💥 Le temps est écoulé, vous avez perdu !");
        }, 200);
      }
    } else {
      setExploded(false);
      alertShownRef.current = false;
    }
  }, [remainingSeconds]);

  if (typeof remainingSeconds !== "number") {
    return (
      <div className="bombe">
        <div className="time">--:--</div>
      </div>
    );
  }

  const mm = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remainingSeconds % 60).toString().padStart(2, "0");

  const warn = remainingSeconds <= 10;

  return (
    <div className={`bombe ${warn ? "warn" : ""} ${exploded ? "exploded" : ""}`}>
      {!exploded && <div className="spark"></div>}
      <div className="time">{mm}:{ss}</div>
      {exploded && <div className="blast-msg show">💥 BOOM!</div>}
    </div>
  );
}
