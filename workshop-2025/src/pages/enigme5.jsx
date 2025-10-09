import { useEffect } from "react";
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

export default function Enigme5() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme5", room);

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

  const handleDebugComplete = () => {
    if (!room || isCompleted) {
      return;
    }
    setEnigmeStatus(room, "enigme5", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme5", completed: true });
  };

  return (
    <div className="game-page">
      <header className="game-header game-header--timer-detached">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme5" room={room} />
          <EnigmePresence players={players} scene="enigme5" />
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
      <div className="game-timer-sticky">
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
      </div>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Énigme 5</h2>
          {isCompleted ? (
            <div className="enigme-post-completion">
              Ajouter ici les informations post reussite de l enigme
            </div>
          ) : null}
          <p>
            Texte de présentation
          </p>
          <div className="puzzle-instructions">
            <p>Énigme</p>
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
