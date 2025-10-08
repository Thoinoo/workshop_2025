import "../styles/components_css/BombeTimer.css";

export default function BombeTimer({ remainingSeconds = null }) {

  const isNumeric = Number.isFinite(remainingSeconds);

  const formattedTime = isNumeric ? `${remainingSeconds.toFixed(1)} BTC` : "0 BTC";

  return (
      <div className="bombe__display">
        <span className="bombe__time">{formattedTime}</span>
      </div>
  );
}
