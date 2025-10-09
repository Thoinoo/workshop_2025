import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import EnigmePresence from "../components/EnigmePresence";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";
import socket from "../socket";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import ToolsMenu from "../components/ToolsMenu";
import { FaKey, FaTimes } from "react-icons/fa";

export default function Enigme4() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme4", room);

  const [foundKeys, setFoundKeys] = useState([]);
  const [wrongCells, setWrongCells] = useState([]);
  const [lastSelection, setLastSelection] = useState(null);
  const [clickedCell, setClickedCell] = useState(null);

  // ✅ Bouton debug pour valider l'énigme
  const handleDebugComplete = () => {
    if (!room || isCompleted) return;
    setEnigmeStatus(room, "enigme4", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });
    socket.emit("stopTimer", { room });
  };

  useEffect(() => {
    if (!missionStarted && !missionFailed) {
      navigate("/preparation", { replace: true });
    }
  }, [missionFailed, missionStarted, navigate]);

  useEffect(() => {
    if (missionFailed && location.pathname !== "/defaite") {
      navigate("/defaite", { replace: true });
    }
  }, [location.pathname, missionFailed, navigate]);

  useEffect(() => {
    if (!room) {
      setFoundKeys([]);
      setWrongCells([]);
      setLastSelection(null);
      return () => {};
    }

    let canceled = false;

    const applySharedState = (payload = {}) => {
      if (canceled) {
        return;
      }

      const nextFound = Array.isArray(payload.foundKeys) ? payload.foundKeys : [];
      const nextWrong = Array.isArray(payload.wrongCells) ? payload.wrongCells : [];

      setFoundKeys(nextFound);
      setWrongCells(nextWrong);
      setLastSelection(payload.lastSelection ?? null);

      if (typeof payload.completed === "boolean") {
        setEnigmeStatus(room, "enigme4", payload.completed);
      }
    };

    socket.on("enigme4:state", applySharedState);
    socket.emit("enigme4:requestState", { room }, (initialState) => {
      applySharedState(initialState || {});
    });

    return () => {
      canceled = true;
      socket.off("enigme4:state", applySharedState);
    };
  }, [room]);

  useEffect(() => {
    if (!lastSelection || !lastSelection.cell) {
      return;
    }

    setClickedCell(lastSelection.cell);
    const timeoutId = setTimeout(() => setClickedCell(null), 300);

    return () => clearTimeout(timeoutId);
  }, [lastSelection]);

  const handleCellClick = (pos) => {
    if (!missionStarted || isCompleted || !room) return;
    if (foundKeys.includes(pos) || wrongCells.includes(pos)) return;
    socket.emit("enigme4:selectCell", { room, cell: pos });
  };

  const letters = ["A", "B", "C", "D"];
  const numbers = [1, 2, 3, 4];
  const cells = letters.flatMap((l) => numbers.map((n) => `${l}${n}`));

  return (
    <div className="game-page">
      <header className="game-header game-header--timer-detached">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme4" room={room} />
          <EnigmePresence players={players} scene="enigme4" />
        </div>
        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
        </div>
      </header>
      <div className="game-timer-sticky">
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
      </div>

{/* Bouton debug */}
          {!isCompleted && (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l'énigme (debug)
            </button>
          )}

          {isCompleted ? (
  <article className="enigme-post-completion">
    <header className="enigme-post-completion__header">
      <h3>Bravo !!</h3>
      <h3>Opération Genesis Key</h3>
      <p className="enigme-post-completion__subtitle">
        Quatrième bloc du reseau Bitcoin - manifeste technique et politique.
      </p>
    </header>

    <div className="enigme-post-completion__grid">
      <section>
        <h4>Distribution</h4>
        <p>
          En 2010, le premier wallet Bitcoin public fut distribué pour tester les transactions entre utilisateurs.
        </p>
      </section>
      <section>
        <h4>Sécurité</h4>
        <p>
          L'introduction des clés privées multiples pour sécuriser les wallets contre le vol fut instaurée en 2011.
         
          
        </p>
      </section>
      <section>
        <h4>Hiérarchie</h4>
        <p>
          En 2013, le développement des wallets HD (Hierarchical Deterministic) a été créé, ce qui a permis la génération de multiples clés à partir d’une seule seed.
        </p>
      </section>
    </div>
  </article>
) : null}

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Énigme 4</h2>
          <p>
            Les clés virtuelles ont disparu. Trouvez-les pour débloquer le wallet. <br />
            Avez-vous été attentifs aux épreuves que vous avez traversées ?<br />
            <strong>[ATTENTION]</strong> Cliquer sur une mauvaise case augmente la vitesse de
            réduction de BTC.
          </p>

          <div className="puzzle-grid">
            {cells.map((cell) => {
              const isKey = foundKeys.includes(cell);
              const isWrong = wrongCells.includes(cell);
              const isClicked = clickedCell === cell;
              return (
                <div
                  key={cell}
                  className={`puzzle-cell ${isKey ? "found" : ""} ${
                    isWrong ? "wrong" : ""
                  } ${isClicked ? "clicked" : ""}`}
                  onClick={() => handleCellClick(cell)}
                >
                  {isKey ? (
                    <FaKey className="icon key-icon" />
                  ) : isWrong ? (
                    <FaTimes className="icon wrong-icon" />
                  ) : (
                    cell
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <ToolsMenu />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>

      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
