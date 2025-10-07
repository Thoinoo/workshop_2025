import { useEffect, useRef, useState } from "react";
import "./BombeTimer.css";

const CRITICAL_THRESHOLD = 45;
const PANIC_THRESHOLD = 10;

export default function BombeTimer({ remainingSeconds = null }) {
  const [exploded, setExploded] = useState(false);
  const alertShownRef = useRef(false);

  const isNumeric = Number.isFinite(remainingSeconds);
  const safeSeconds = isNumeric ? Math.max(remainingSeconds, 0) : 0;

  useEffect(() => {
    if (!isNumeric) {
      setExploded(false);
      alertShownRef.current = false;
      return;
    }

    if (remainingSeconds <= 0) {
      setExploded(true);

      if (!alertShownRef.current) {
        alertShownRef.current = true;
        setTimeout(() => {
          alert("Le temps est ecoule, vous avez perdu !");
        }, 200);
      }
    } else {
      setExploded(false);
      alertShownRef.current = false;
    }
  }, [isNumeric, remainingSeconds]);

  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(Math.floor(safeSeconds % 60)).padStart(2, "0");
  const formattedTime = isNumeric ? `${minutes}:${seconds}` : "--:--";

  const isCritical = isNumeric && remainingSeconds > 0 && remainingSeconds <= CRITICAL_THRESHOLD;
  const isPanic = isNumeric && remainingSeconds > 0 && remainingSeconds <= PANIC_THRESHOLD;

  const stressLevel = isPanic
    ? 1
    : isCritical
      ? (CRITICAL_THRESHOLD - remainingSeconds) / CRITICAL_THRESHOLD
      : 0;

  const secondsProgress = safeSeconds > 0 ? (safeSeconds % 60) / 60 : 0;

  const classes = [
    "bombe",
    isCritical ? "bombe--critical" : "",
    isPanic ? "bombe--panic" : "",
    exploded ? "bombe--exploded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    "--seconds-progress": secondsProgress,
    "--stress-level": Math.max(0, Math.min(1, stressLevel)),
  };

  const ariaLabel = exploded
    ? "Temps ecoule"
    : isNumeric
      ? `Temps restant ${minutes} minutes et ${seconds} secondes`
      : "Temps restant non initialise";

  return (
    <div className={classes} style={style} role="timer" aria-live="polite" aria-label={ariaLabel}>
      {!exploded && (
        <>
          <div className="bombe__ring" aria-hidden="true" />
          <div className="bombe__halo" aria-hidden="true" />
          <div className="bombe__spark" aria-hidden="true" />
        </>
      )}
      <div className="bombe__display">
        <span className="bombe__label">Temps restant</span>
        <span className="bombe__time">{formattedTime}</span>
      </div>
      {exploded && (
        <div className="bombe__blast" role="alert">
          BOOM !
        </div>
      )}
    </div>
  );
}
