import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useRoomState from "../hooks/useRoomState";
import "../styles/components_css/BombeTimer.css";
import robotFrame1 from "../assets/robot/robot_frame_1.png";
import robotFrame2 from "../assets/robot/robot_frame_2.png";
import robotFrame3 from "../assets/robot/robot_frame_3.png";
import robotFrame4 from "../assets/robot/robot_frame_4.png";

const SPRITE_FRAMES = [robotFrame1, robotFrame2, robotFrame3, robotFrame4];
const SPRITE_FRAME_COUNT = SPRITE_FRAMES.length;
const ROBOT_RESPAWN_STORAGE_KEY = "bombeTimerRobotRespawnAt";
const MIN_ROBOT_RESPAWN_DELAY_MS = 10_000;
const MAX_ROBOT_RESPAWN_DELAY_MS = 60_000;

function readStoredRespawnAt() {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.sessionStorage.getItem(ROBOT_RESPAWN_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  const parsed = Number(stored);
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.sessionStorage.removeItem(ROBOT_RESPAWN_STORAGE_KEY);
    return null;
  }
  return parsed;
}

export default function BombeTimer({ remainingSeconds = null }) {
  const isNumeric = Number.isFinite(remainingSeconds);

  const initialRespawnAt = readStoredRespawnAt();
  const [randomSuffix, setRandomSuffix] = useState("");
  const [spriteFrame, setSpriteFrame] = useState(0);
  const [robotRespawnAt, setRobotRespawnAt] = useState(initialRespawnAt);
  const [robotVisible, setRobotVisible] = useState(initialRespawnAt === null);
  const shouldAnimate = isNumeric && remainingSeconds > 0;
  const shouldAnimateSprite = shouldAnimate && robotVisible;
  const { missionStarted } = useRoomState();
  const TUTORIAL_STORAGE_KEY = "timerTutorialDismissedMission";
  const [dismissedMissionId, setDismissedMissionId] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(TUTORIAL_STORAGE_KEY);
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const robotRespawnTimeoutRef = useRef(null);

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

  const handleRobotDismiss = useCallback(() => {
    if (!robotVisible) {
      return;
    }

    const respawnDelayRange = MAX_ROBOT_RESPAWN_DELAY_MS - MIN_ROBOT_RESPAWN_DELAY_MS;
    const respawnDelay =
      MIN_ROBOT_RESPAWN_DELAY_MS +
      Math.floor(respawnDelayRange > 0 ? Math.random() * (respawnDelayRange + 1) : 0);
    const respawnAt = Date.now() + respawnDelay;

    setRobotVisible(false);
    setRobotRespawnAt(respawnAt);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ROBOT_RESPAWN_STORAGE_KEY, String(respawnAt));
    }
  }, [robotVisible, setRobotRespawnAt]);

  useEffect(() => {
    if (!shouldAnimate) {
      setRandomSuffix("");
      setSpriteFrame(0);
      return;
    }

    const interval = window.setInterval(() => {
      const digits = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      setRandomSuffix(digits);
    }, 50);

    return () => window.clearInterval(interval);
  }, [shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimateSprite) {
      return () => {};
    }

    const interval = window.setInterval(() => {
      setSpriteFrame((previous) => (previous + 1) % SPRITE_FRAME_COUNT);
    }, 180);

    return () => window.clearInterval(interval);
  }, [shouldAnimateSprite]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }

    if (robotVisible) {
      if (robotRespawnTimeoutRef.current) {
        window.clearTimeout(robotRespawnTimeoutRef.current);
        robotRespawnTimeoutRef.current = null;
      }
      if (robotRespawnAt !== null) {
        setRobotRespawnAt(null);
      }
      window.sessionStorage.removeItem(ROBOT_RESPAWN_STORAGE_KEY);
      return () => {};
    }

    if (robotRespawnAt === null) {
      return () => {};
    }

    const remaining = robotRespawnAt - Date.now();
    if (remaining <= 0) {
      setRobotVisible(true);
      setRobotRespawnAt(null);
      window.sessionStorage.removeItem(ROBOT_RESPAWN_STORAGE_KEY);
      return () => {};
    }

    robotRespawnTimeoutRef.current = window.setTimeout(() => {
      setRobotVisible(true);
      setRobotRespawnAt(null);
      window.sessionStorage.removeItem(ROBOT_RESPAWN_STORAGE_KEY);
      robotRespawnTimeoutRef.current = null;
    }, remaining);

    return () => {
      if (robotRespawnTimeoutRef.current) {
        window.clearTimeout(robotRespawnTimeoutRef.current);
        robotRespawnTimeoutRef.current = null;
      }
    };
  }, [robotVisible, robotRespawnAt, setRobotRespawnAt]);

  useEffect(() => {
    return () => {
      if (robotRespawnTimeoutRef.current) {
        window.clearTimeout(robotRespawnTimeoutRef.current);
        robotRespawnTimeoutRef.current = null;
      }
    };
  }, []);

  const firstDecimalValue = isNumeric
    ? remainingSeconds <= 0
      ? "0"
      : (Math.floor(remainingSeconds * 10) / 10).toFixed(1)
    : null;

  const formattedTime = isNumeric
    ? `${firstDecimalValue}${shouldAnimate && randomSuffix ? randomSuffix : ""}\u00a0BTC`
    : "0\u00a0BTC";

  const containerClassName = useMemo(
    () =>
      ["bombe__display", showTutorial ? "bombe__display--highlight" : ""]
        .filter(Boolean)
        .join(" "),
    [showTutorial]
  );

  const spriteSrc = SPRITE_FRAMES[spriteFrame] ?? SPRITE_FRAMES[0];

  return (
    <div className="bombe-timer" role="status" aria-live="polite">
      {robotVisible ? (
        <div className="bombe-timer__robot">
          <div
            className="bombe-timer__sprite bombe-timer__sprite--dismissible"
            role="button"
            tabIndex={0}
            aria-label="Masquer le robot"
            onClick={handleRobotDismiss}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "Space") {
                event.preventDefault();
                handleRobotDismiss();
              }
            }}
          >
            <img src={spriteSrc} alt="" />
            <div className="bombe-timer__btc-fx" aria-hidden="true">
              - 1&nbsp;BTC
            </div>
          </div>
          <p className="bombe-timer__hint" role="status" aria-live="assertive">
            click sur le voleur pour le faire fuire&nbsp;!
          </p>
        </div>
      ) : null}
      <div className={containerClassName}>
        {showTutorial ? (
          <div className="bombe__tutorial" role="dialog" aria-live="polite">
            <p>
              Ne laissez pas les Bicoin tomber le compteur à zéro !
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
    </div>
  );
}
