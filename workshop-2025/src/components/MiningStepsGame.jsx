import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/components_css/MiningStepsGame.css";

const GRID_ROWS = 5;
const GRID_COLUMNS = 5;
const TOTAL_PIECES = GRID_ROWS * GRID_COLUMNS;
const PREVIEW_DURATION_MS = 5_000;
const IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg";

const STEP_HINTS = [
  "Transaction creee",
  "Signature numerique",
  "Diffusion reseau",
  "Noeuds valident",
  "Stockage mempool",
  "Selection mineurs",
  "Debut du minage",
  "Bloc ajoute",
  "Transactions confirmees",
  "Recompense mineur",
  "Blockchain a jour",
  "Destinataire credite",
  "Nouvelle operation",
  "Bloc verifie",
  "Nonce trouve",
  "Recompense finalisee",
  "Mempool trie",
  "Bloc propage",
  "Consensus obtenu",
  "Bloc en attente",
  "Relance transaction",
  "Adresse validee",
  "Signature confirmee",
  "Hash verifie",
  "Recompense distribuee"
];

export default function MiningStepsGame({ onComplete, disabled = false }) {
  const [pieces, setPieces] = useState(() =>
    Array.from({ length: TOTAL_PIECES }, (_, index) => index)
  );
  const [isPreview, setIsPreview] = useState(true);
  const [dragOriginIndex, setDragOriginIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [timerRemaining, setTimerRemaining] = useState(Math.ceil(PREVIEW_DURATION_MS / 1000));
  const [isSolved, setIsSolved] = useState(false);

  const shufflePieces = useCallback(() => {
    setPieces((current) => {
      const shuffled = [...current];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  useEffect(() => {
    if (!isPreview || disabled) {
      return () => {};
    }

    const interval = window.setInterval(() => {
      setTimerRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsPreview(false);
          shufflePieces();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPreview, disabled, shufflePieces]);

  useEffect(() => {
    if (!disabled) {
      return () => {};
    }
    setIsPreview(false);
    setTimerRemaining(0);
    setIsSolved(true);
    return () => {};
  }, [disabled]);

  const handleDragStart = useCallback((index) => {
    setDragOriginIndex(index);
  }, []);

  const handleDrop = useCallback(
    (targetIndex) => {
      if (
        disabled ||
        dragOriginIndex === null ||
        targetIndex < 0 ||
        targetIndex >= pieces.length
      ) {
        setDragOriginIndex(null);
        return;
      }

      if (dragOriginIndex === targetIndex) {
        setDragOriginIndex(null);
        return;
      }

      setPieces((current) => {
        const updated = [...current];
        [updated[targetIndex], updated[dragOriginIndex]] = [
          updated[dragOriginIndex],
          updated[targetIndex]
        ];

        const solved = updated.every((value, index) => value === index);
        if (solved) {
          setIsSolved(true);
          if (typeof onComplete === "function") {
            onComplete();
          }
        }

        return updated;
      });
      setDragOriginIndex(null);
    },
    [disabled, dragOriginIndex, pieces.length, onComplete]
  );

  const boardStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
      gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`
    }),
    []
  );

  return (
    <div className="mining-steps-game" aria-live="polite">
      <header className="mining-steps-header">
        <h3>Assemblez le cycle du minage</h3>
        {isPreview && !disabled ? (
          <p className="mining-steps-preview">
            Mettez toutes les etapes dans l ordre. Memmorisez le visuel ({timerRemaining}s).
          </p>
        ) : null}
        {isSolved ? (
          <p className="mining-steps-success">Cycle complet ! Transaction securisee.</p>
        ) : null}
      </header>

      <div
        className="mining-steps-board"
        style={boardStyle}
        role="grid"
        aria-label="Puzzle sequence du minage"
      >
        {pieces.map((pieceIndex, index) => {
          const row = Math.floor(pieceIndex / GRID_COLUMNS);
          const column = pieceIndex % GRID_COLUMNS;
          const showHint = hoveredIndex === index && !isPreview;

          return (
            <div
              key={index}
              className={[
                "mining-steps-piece",
                isPreview ? "is-preview" : "",
                isSolved ? "is-solved" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              role="gridcell"
              draggable={!isPreview && !isSolved && !disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                backgroundImage: `url(${IMAGE_URL})`,
                backgroundSize: `${GRID_COLUMNS * 100}% ${GRID_ROWS * 100}%`,
                backgroundPosition: `${(column * 100) / (GRID_COLUMNS - 1)}% ${
                  (row * 100) / (GRID_ROWS - 1)
                }%`
              }}
            >
              {showHint ? <span>{STEP_HINTS[pieceIndex]}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
