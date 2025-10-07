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
import errorImg from "../assets/error.png";
import "../styles/enigme2.css";
import socket from "../socket";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import ToolsMenu from "../components/ToolsMenu";

export default function Enigme2() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme2", room);

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
    setEnigmeStatus(room, "enigme2", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme2", completed: true });
  };

  const nodes = [
    { id: 1, angle: 0 },
    { id: 2, angle: 60 },
    { id: 3, angle: 120 },
    { id: 4, angle: 180 },
    { id: 5, angle: 240 },
    { id: 6, angle: 300 },
  ];

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme2" room={room} />
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
              Valider l enigme (debug)
            </button>
          ) : null}
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 2</h2>
          {isCompleted ? (
            <div className="enigme-post-completion">
              Ajouter ici les informations post reussite de l enigme
            </div>
          ) : null}
          <p>
            La base de donnees est corrompue : trouvez un moyen de stocker les donnees de maniere securisee.
          </p>
          <div className="puzzle-instructions">
            <div className="database-error">
              <img src={errorImg} alt="Erreur base de donnees" />
            </div>
            {/* Noeuds autour */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className="node"
                style={{
                  transform: `rotate(${node.angle}deg) translate(160px) rotate(-${node.angle}deg)`,
                }}
              >
                <span>{node.id}</span>
              </div>
            ))}
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
