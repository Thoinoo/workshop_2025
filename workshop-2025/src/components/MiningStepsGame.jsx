import { useCallback, useEffect, useMemo, useState } from "react";
import FriendHelp from "./FriendHelp";
import "../styles/components_css/MiningStepsGame.css";

const GRID_ROWS = 5;
const GRID_COLUMNS = 5;
const TOTAL_PIECES = GRID_ROWS * GRID_COLUMNS;
const PREVIEW_DURATION_MS = 5_000;
const INITIAL_GAME_TIME = 120;
const HELP_COST = 20; // Retire 20s
const HELP_DURATION = 20;
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

  //Timers
  const [previewTimer, setPreviewTimer] = useState(Math.ceil(PREVIEW_DURATION_MS / 1000));
  const [gameTime, setGameTime] = useState(INITIAL_GAME_TIME);
  const [isSolved, setIsSolved] = useState(false);

  //Aide
  const [helpActive, setHelpActive] = useState(false);
  const [helpCountdown, setHelpCountdown] = useState(0);
  const [helpTimer, setHelpTimer] = useState(null);

  // Mélange les pièces
  const shufflePieces = useCallback(() => {
    setPieces((current) => {
      const shuffled = [...current];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  // Prévisualisation 5s
  useEffect(() => {
    if (!isPreview || disabled) return;

    const interval = setInterval(() => {
      setPreviewTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPreview(false);
          shufflePieces();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPreview, disabled, shufflePieces]);

  // Timer principal — Boucle infinie tant que non résolu
  useEffect(() => {
    if (isPreview || isSolved || disabled) return;

    const timer = setInterval(() => {
      setGameTime((prev) => {
        // Quand le temps atteint 0 → remélange, repart à 100, continue la boucle
        if (prev <= 1) {
          shufflePieces();
          return INITIAL_GAME_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPreview, isSolved, disabled, shufflePieces]);

  // Début du drag
  const handleDragStart = useCallback((index) => {
    setDragOriginIndex(index);
  }, []);

  // Drop
  const handleDrop = useCallback(
    (targetIndex) => {
      if (disabled || dragOriginIndex === null) {
        setDragOriginIndex(null);
        return;
      }

      setPieces((current) => {
        const updated = [...current];
        [updated[targetIndex], updated[dragOriginIndex]] = [
          updated[dragOriginIndex],
          updated[targetIndex]
        ];

        const solved = updated.every((v, i) => v === i);
        if (solved) {
          setIsSolved(true);
          if (typeof onComplete === "function") onComplete();
        }

        return updated;
      });

      setDragOriginIndex(null);
    },
    [disabled, dragOriginIndex, onComplete]
  );

  // Aide : affiche les numéros 20s et retire 20s du chrono
  const handleHelpClick = () => {
    if (gameTime <= HELP_COST) return; // pas assez de temps

    // Retire 20s du timer principal
    setGameTime((t) => Math.max(t - HELP_COST, 0));

    // Active l’aide pendant 20s
    setHelpActive(true);
    setHelpCountdown(HELP_DURATION);

    if (helpTimer) clearInterval(helpTimer);
    const timer = setInterval(() => {
      setHelpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHelpActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setHelpTimer(timer);
  };
  const handleCorrectAnswer = () => {
  setGameTime((prev) => prev + 15);
};

const handleWrongAnswer = () => {
  // rien de spécial, le joueur doit recliquer
};


  // Style de la grille
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
        <h3>🪙 Assemblez le cycle du minage</h3>

        {isPreview && !disabled && (
          <p className="mining-steps-preview">
            Prévisualisation ({previewTimer}s) ⏳
          </p>
        )}

        {!isPreview && !isSolved && (
          <p className="mining-steps-timer">
            ⏱️ Temps restant : {gameTime}s
          </p>
        )}
        {gameTime <= 35 && !isSolved && !isPreview && (
  <FriendHelp
    onCorrectAnswer={handleCorrectAnswer}
    onWrongAnswer={handleWrongAnswer}
  />
)}


        {isSolved && <p className="mining-steps-success">✅ Cycle complet ! Transaction sécurisée.</p>}

        {helpActive && (
          <p className="mining-steps-warning">
            💡 Aide active — {helpCountdown}s restantes
          </p>
        )}
      </header>

      <div
        className="mining-steps-board"
        style={boardStyle}
        role="grid"
        aria-label="Puzzle séquence du minage"
      >
        {pieces.map((pieceIndex, index) => {
          const row = Math.floor(pieceIndex / GRID_COLUMNS);
          const column = pieceIndex % GRID_COLUMNS;
          const showHint = hoveredIndex === index && !isPreview && !helpActive;

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
              onDragOver={(e) => e.preventDefault()}
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
              {helpActive ? (
                <span>{pieceIndex + 1}</span>
              ) : (
                showHint && <span>{STEP_HINTS[pieceIndex]}</span>
              )}
            </div>
          );
        })}
      </div>

      {!isSolved && !isPreview && (
        <button
          className="help-button"
          onClick={handleHelpClick}
          disabled={helpActive || gameTime <= HELP_COST}
        >
          💡 Demander de l’aide (-20s)
        </button>
      )}
    </div>
  );
}

