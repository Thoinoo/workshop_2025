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
  const [clickedCell, setClickedCell] = useState(null);
  const keyPositions = ["A2", "C3", "D1"];

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
    if (foundKeys.includes(pos) || wrongCells.includes(pos)) return;

    setClickedCell(pos);

    if (keyPositions.includes(pos)) {
      setFoundKeys((prev) => [...prev, pos]);

      if (foundKeys.length + 1 >= keyPositions.length && !isCompleted) {
        // ✅ Marquer comme terminée
        setEnigmeStatus(room, "enigme4", true);
        socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });

        // 🕒 Stopper le timer pour tout le monde
        socket.emit("stopTimer", { room });
      }
    } else {
      setWrongCells((prev) => [...prev, pos]);
      const factor = (wrongCells.length + 1) * 2;
      socket.emit("accelerateTimer", { room, factor });
      socket.emit("chatMessage", {
        room,
        username: "SYSTEM",
        message: `⚠️ Mauvaise case (${pos}) — vitesse x${factor}`,
      });
    }

    setTimeout(() => setClickedCell(null), 300);
  };

  useEffect(() => {
    if (foundKeys.length === keyPositions.length && !isCompleted) {
      setEnigmeStatus(room, "enigme4", true);
      socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });
      socket.emit("stopTimer", { room }); // stop du timer
    }
  }, [foundKeys, isCompleted, room]);

  const letters = ["A", "B", "C", "D"];
  const numbers = [1, 2, 3, 4];
  const cells = letters.flatMap((l) => numbers.map((n) => `${l}${n}`));

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme4" room={room} />
          <EnigmePresence players={players} scene="enigme4" />
        </div>
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
        <div className="game-header-section game-header-section--actions">
          <ToolsMenu />
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 4</h2>
          <p>
            Les clés virtuelles ont disparu. Trouvez-les pour débloquer le wallet. <br />
            Avez-vous été attentifs aux épreuves que vous avez traversées ?<br />
            <strong>[ATTENTION]</strong> Cliquer sur une mauvaise case augmente la vitesse de
            réduction de BTC. Comme quoi une erreur est vite arrivée...
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
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>

      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
