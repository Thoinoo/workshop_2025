import { useEffect, useRef, useState } from "react";
import "../assets/components_css/BombeTimer.css";

export default function BombeTimer({ remainingSeconds = null }) {

  const isNumeric = Number.isFinite(remainingSeconds);

  const [randomSuffix, setRandomSuffix] = useState("");

  useEffect(() => {
    if (!isNumeric) {
      setRandomSuffix("");
      return;
    }

    setRandomSuffix("");

    // Rotate random digits quickly to mimic sub-decimal countdown noise.
    const interval = setInterval(() => {
      const digits = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      setRandomSuffix(digits);
    }, 50);

    return () => clearInterval(interval);
  }, [isNumeric, remainingSeconds]);

  const firstDecimalValue = isNumeric
    ? (Math.floor(remainingSeconds * 10) / 10).toFixed(1)
    : null;

  const formattedTime = isNumeric
    ? `${firstDecimalValue}${randomSuffix ? randomSuffix : "461"} BTC`
    : "0 BTC";

  return (
      <div className="bombe__display">
        <span className="bombe__time">{formattedTime}</span>
      </div>
  );
}
