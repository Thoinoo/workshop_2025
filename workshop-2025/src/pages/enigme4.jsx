import { useEffect } from "react";
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

export default function Enigme4() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted } = useRoomState();
  const isCompleted = useEnigmeCompletion("enigme4", room);

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

  const handleDebugComplete = () => {
    if (!room || isCompleted) {
      return;
    }
    setEnigmeStatus(room, "enigme4", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme4", completed: true });
  };

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme4" room={room} />
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
          {!isCompleted ? (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l enigme (debug)
            </button>
          ) : null}
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 4</h2>
          <p>
            Les cles virtuelles ont disparu. A vous de les retrouver afin de debloquer le wallet.
          </p>
          <div className="puzzle-instructions"></div>
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
