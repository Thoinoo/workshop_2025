import { useEffect, useRef, useState } from "react";
import "../styles/components_css/BombeTimer.css";

export default function BombeTimer({ remainingSeconds = null }) {

  const isNumeric = Number.isFinite(remainingSeconds);

  const [randomSuffix, setRandomSuffix] = useState("");
  const shouldAnimate = isNumeric && remainingSeconds > 0;

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

  const firstDecimalValue = isNumeric
    ? remainingSeconds <= 0
      ? "0"
      : (Math.floor(remainingSeconds * 10) / 10).toFixed(1)
    : null;

  const formattedTime =  isNumeric
    ? `${firstDecimalValue}${shouldAnimate && randomSuffix ? randomSuffix : ""} BTC`
    : "0 BTC";

  return (
      <div className="bombe__display">
        <span className="bombe__time">{formattedTime}</span>
      </div>
  );
}
