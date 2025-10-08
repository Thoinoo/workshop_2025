import { useCallback, useEffect, useMemo, useState } from "react";
import useRoomState from "../hooks/useRoomState";
import "../styles/components_css/BombeTimer.css";

export default function BombeTimer({ remainingSeconds = null }) {

  const isNumeric = Number.isFinite(remainingSeconds);

  const [randomSuffix, setRandomSuffix] = useState("");
  const shouldAnimate = isNumeric && remainingSeconds > 0;
  const { missionStarted } = useRoomState();
  const TUTORIAL_STORAGE_KEY = "timerTutorialDismissedMission";
  const [dismissedMissionId, setDismissedMissionId] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(TUTORIAL_STORAGE_KEY);
  });
  const [showTutorial, setShowTutorial] = useState(false);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    if (typeof window !== "undefined") {
      const missionId = window.sessionStorage.getItem("missionStartTimestamp");
      if (missionId) {
        window.sessionStorage.setItem(TUTORIAL_STORAGE_KEY, missionId);
        setDismissedMissionId(missionId);
      }
    }
  }, []);

  useEffect(() => {
    if (!shouldAnimate) {
      setRandomSuffix("");
      return;
    }

    // Rotate random digits quickly to mimic sub-decimal countdown noise.
    const interval = setInterval(() => {
      const digits = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      setRandomSuffix(digits);
    }, 50);

    return () => clearInterval(interval);
  }, [shouldAnimate]);

  useEffect(() => {
    if (!missionStarted) {
      setShowTutorial(false);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const missionId = window.sessionStorage.getItem("missionStartTimestamp");
    if (missionId && missionId !== dismissedMissionId) {
      setShowTutorial(true);
    }
  }, [missionStarted, dismissedMissionId]);

  const firstDecimalValue = isNumeric
    ? remainingSeconds <= 0
      ? "0"
      : (Math.floor(remainingSeconds * 10) / 10).toFixed(1)
    : null;

  const formattedTime =  isNumeric
    ? `${firstDecimalValue}${shouldAnimate && randomSuffix ? randomSuffix : ""} BTC`
    : "0 BTC";

  const containerClassName = useMemo(
    () =>
      ["bombe__display", showTutorial ? "bombe__display--highlight" : ""]
        .filter(Boolean)
        .join(" "),
    [showTutorial]
  );

  return (
      <div className={containerClassName}>
        {showTutorial ? (
          <div className="bombe__tutorial" role="dialog" aria-live="polite">
            <p>
              QG - Compte a rebours actif. Ce compteur BTC mesure l energie restante avant effondrement.
              Gardez-le dans le vert si vous voulez sortir vivants.
            </p>
            <button
              type="button"
              className="bombe__tutorial-close"
              onClick={dismissTutorial}
              aria-label="Fermer le rappel sur le timer"
            >
              Compris
            </button>
          </div>
        ) : null}
        <span className="bombe__time">{formattedTime}</span>
      </div>
  );
}
