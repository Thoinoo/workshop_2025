import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";
import socket from "../socket";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import ToolsMenu from "../components/ToolsMenu";
import { FaKey, FaTimes } from "react-icons/fa"; // <--- ajout de la croix

export default function Enigme4() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme4", room);

  const [foundKeys, setFoundKeys] = useState([]);
  const [wrongCells, setWrongCells] = useState([]);
  const keyPositions = ["A2", "C3", "D1"]; // cases contenant les clés

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

const handleCellClick = (pos) => {
  if (!missionStarted || isCompleted || !room) return;
  if (foundKeys.includes(pos) || wrongCells.includes(pos)) return; // ← remplacé cellState

  if (keyPositions.includes(pos)) {
    setFoundKeys((prev) => [...prev, pos]);

    if (foundKeys.length + 1 >= keyPositions.length && !isCompleted) {
      setEnigmeStatus(room, "enigme4", true);
      socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });
    }
  } else {
    setWrongCells((prev) => [...prev, pos]);

    const factor = (wrongCells.length + 1) * 2; // 1ère mauvaise = x2, 2ème = x4, 3ème = x6
    socket.emit("accelerateTimer", { room, factor });

    socket.emit("chatMessage", {
      room,
      username: "SYSTEM",
      message: `⚠️ Mauvaise case (${pos}) — vitesse x${factor}`
    });
  }
};


  useEffect(() => {
    if (foundKeys.length === keyPositions.length && !isCompleted) {
      setEnigmeStatus(room, "enigme4", true);
      socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });
    }
  }, [foundKeys, isCompleted, room]);

  const handleDebugComplete = () => {
    if (!room || isCompleted) return;
    setEnigmeStatus(room, "enigme4", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });
  };

  const letters = ["A", "B", "C", "D"];
  const numbers = [1, 2, 3, 4];
  const cells = letters.flatMap((l) => numbers.map((n) => `${l}${n}`));

  return (
    <div className="game-page">
      {/* HEADER inchangé */}
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme4" room={room} />
        </div>
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
        <div className="game-header-section game-header-section--actions">
          <ToolsMenu />
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
          {!isCompleted ? (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l énigme (debug)
            </button>
          ) : null}
        </div>
      </header>

      {/* CONTENU ENIGME */}
      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 4</h2>
          <p>Les clés virtuelles ont disparu. Trouvez-les pour débloquer le wallet.</p>

          <div className="puzzle-grid">
            {cells.map((cell) => {
              const isKey = foundKeys.includes(cell);
              const isWrong = wrongCells.includes(cell);
              return (
                <div
                  key={cell}
                  className={`puzzle-cell ${isKey ? "found" : ""} ${isWrong ? "wrong" : ""}`}
                  onClick={() => handleCellClick(cell)}
                >
                  {isKey ? (
                    <FaKey className="key-icon" />
                  ) : isWrong ? (
                    <FaTimes className="wrong-icon" />
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
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>

      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
