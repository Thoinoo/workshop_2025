import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FriendHelp from "./FriendHelp";
import socket from "../socket";
import "../styles/components_css/MiningStepsGame.css";

const GRID_ROWS = 5;
const GRID_COLUMNS = 5;
const TOTAL_PIECES = GRID_ROWS * GRID_COLUMNS;
const HELP_COST_SECONDS = 20;
const FRIEND_HELP_TRIGGER_THRESHOLD = 35;
const DEFAULT_PIECES = Array.from({ length: TOTAL_PIECES }, (_, index) => index);
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

const clampPositiveSeconds = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.ceil(value / 1000)) : 0;

export default function MiningStepsGame({ room, onComplete, onHelpUsed, disabled = false }) {
  const [sharedState, setSharedState] = useState(null);
  const [dragOriginIndex, setDragOriginIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [requestingHelp, setRequestingHelp] = useState(false);
  const [tick, setTick] = useState(0);
  const serverOffsetRef = useRef(0);
  const previousHelpUsesRef = useRef(0);
  const completionNotifiedRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setSharedState(null);
    previousHelpUsesRef.current = 0;
    completionNotifiedRef.current = false;

    if (!room) {
      return () => {};
    }

    let isMounted = true;

    const handleState = (payload = {}) => {
      if (!isMounted) {
        return;
      }
      const serverTimestamp = Number(payload.serverTimestamp);
      if (Number.isFinite(serverTimestamp)) {
        serverOffsetRef.current = Date.now() - serverTimestamp;
      }
      setSharedState(payload);
    };

    socket.on("enigme5:state", handleState);
    socket.emit("enigme5:requestState", { room }, (snapshot) => {
      handleState(snapshot || {});
    });

    return () => {
      isMounted = false;
      socket.off("enigme5:state", handleState);
    };
  }, [room]);

  useEffect(() => {
    const helpUses = Number(sharedState?.helpUses) || 0;
    const previous = previousHelpUsesRef.current || 0;

    if (helpUses !== previous) {
      previousHelpUsesRef.current = helpUses;
      if (typeof onHelpUsed === "function") {
        onHelpUsed({
          delta: helpUses - previous,
          totalPenaltySeconds:
            Number(sharedState?.helpPenaltySeconds) || helpUses * 500,
          totalUses: helpUses
        });
      }
    }
  }, [sharedState?.helpUses, sharedState?.helpPenaltySeconds, onHelpUsed]);

  const derived = useMemo(() => {
    const phase = sharedState?.phase ?? "preview";
    const pieces = Array.isArray(sharedState?.pieces) ? sharedState.pieces : DEFAULT_PIECES;
    const serverNow = Date.now() - serverOffsetRef.current;

    const previewEndsAt = Number(sharedState?.previewEndsAt) || null;
    const gameDeadline = Number(sharedState?.gameDeadline) || null;
    const helpActiveUntil = Number(sharedState?.helpActiveUntil) || null;

    const previewRemainingSeconds = previewEndsAt
      ? clampPositiveSeconds(previewEndsAt - serverNow)
      : 0;
    const gameRemainingSeconds = gameDeadline
      ? clampPositiveSeconds(gameDeadline - serverNow)
      : 0;
    const helpRemainingSeconds = helpActiveUntil
      ? clampPositiveSeconds(helpActiveUntil - serverNow)
      : 0;

    return {
      phase,
      pieces,
      previewRemainingSeconds,
      gameRemainingSeconds,
      helpRemainingSeconds,
      helpActive: helpRemainingSeconds > 0,
      isSolved: phase === "solved",
      helpPenaltySeconds: Number(sharedState?.helpPenaltySeconds) || 0
    };
  }, [sharedState, tick]);

  useEffect(() => {
    if (!derived.isSolved) {
      completionNotifiedRef.current = false;
      return;
    }
    if (!completionNotifiedRef.current && typeof onComplete === "function") {
      completionNotifiedRef.current = true;
      onComplete();
    }
  }, [derived.isSolved, onComplete]);

  const handleDragStart = useCallback((index) => {
    setDragOriginIndex(index);
  }, []);

  const handleDrop = useCallback(
    (targetIndex) => {
      if (
        dragOriginIndex === null ||
        dragOriginIndex === targetIndex ||
        !room ||
        disabled ||
        derived.phase !== "active" ||
        derived.isSolved
      ) {
        setDragOriginIndex(null);
        return;
      }

      socket.emit("enigme5:swapPieces", {
        room,
        sourceIndex: dragOriginIndex,
        targetIndex
      });
      setDragOriginIndex(null);
    },
    [dragOriginIndex, room, disabled, derived.phase, derived.isSolved]
  );

  const handleHelpClick = useCallback(() => {
    if (!room || requestingHelp || disabled || derived.phase !== "active" || derived.isSolved) {
      return;
    }
    setRequestingHelp(true);
    socket.emit("enigme5:requestHelp", { room }, () => {
      setRequestingHelp(false);
    });
  }, [room, requestingHelp, disabled, derived.phase, derived.isSolved]);

  const handleCorrectAnswer = useCallback(() => {
    if (!room || disabled || derived.phase !== "active" || derived.isSolved) {
      return;
    }
    socket.emit("enigme5:friendHelpSuccess", { room });
  }, [room, disabled, derived.phase, derived.isSolved]);

  const handleWrongAnswer = useCallback(() => {}, []);

  const boardStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
      gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`
    }),
    []
  );

  const canDrag = derived.phase === "active" && !derived.isSolved && !disabled;
  const showFriendHelp =
    derived.phase === "active" &&
    !derived.isSolved &&
    !disabled &&
    derived.gameRemainingSeconds <= FRIEND_HELP_TRIGGER_THRESHOLD;

  return (
    <div className="mining-steps-game" aria-live="polite">
      <header className="mining-steps-header">
        <h3>Assemblez le cycle du minage</h3>

        {derived.phase === "preview" && !disabled ? (
          <p className="mining-steps-preview">Previsualisation ({derived.previewRemainingSeconds}s)</p>
        ) : null}

        {derived.phase === "active" && !derived.isSolved ? (
          <p className="mining-steps-timer">Temps restant : {derived.gameRemainingSeconds}s</p>
        ) : null}

        {showFriendHelp ? (
          <FriendHelp onCorrectAnswer={handleCorrectAnswer} onWrongAnswer={handleWrongAnswer} />
        ) : null}

        {derived.isSolved ? <p className="mining-steps-success">Cycle complet ! Transaction securisee.</p> : null}

        {derived.helpActive ? (
          <p className="mining-steps-warning">Aide active - {derived.helpRemainingSeconds}s restantes</p>
        ) : null}
      </header>

      <div
        className="mining-steps-board"
        style={boardStyle}
        role="grid"
        aria-label="Puzzle sequence du minage"
      >
        {derived.pieces.map((pieceIndex, index) => {
          const row = Math.floor(pieceIndex / GRID_COLUMNS);
          const column = pieceIndex % GRID_COLUMNS;
          const showHint =
            hoveredIndex === index && derived.phase === "active" && !derived.helpActive && !derived.isSolved;

          return (
            <div
              key={index}
              className={[
                "mining-steps-piece",
                derived.phase === "preview" ? "is-preview" : "",
                derived.isSolved ? "is-solved" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              role="gridcell"
              draggable={canDrag}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragOriginIndex(null)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                backgroundImage: `url(${IMAGE_URL})`,
                backgroundSize: `${GRID_COLUMNS * 100}% ${GRID_ROWS * 100}%`,
                backgroundPosition: `${(column * 100) / (GRID_COLUMNS - 1)}% ${(row * 100) / (GRID_ROWS - 1)}%`,
                cursor: canDrag ? "grab" : "default"
              }}
            >
              {derived.helpActive ? <span>{pieceIndex + 1}</span> : showHint ? <span>{STEP_HINTS[pieceIndex]}</span> : null}
            </div>
          );
        })}
      </div>

      {!derived.isSolved && derived.phase === "active" ? (
        <button
          className="help-button"
          onClick={handleHelpClick}
          disabled={
            requestingHelp ||
            derived.helpActive ||
            disabled ||
            derived.gameRemainingSeconds <= HELP_COST_SECONDS
          }
        >
          Demander de l'aide (-{HELP_COST_SECONDS}s)
        </button>
      ) : null}
    </div>
  );
}
