import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import errorImg from "../assets/error.png";
import "../styles/enigme2.css";

export default function Enigme2() {
  const navigate = useNavigate();
  const { username, players, chat, timerRemaining, sendMessage, missionStarted } = useRoomState();

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

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
          <EnigmesGridMenu active="enigme2" />
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 2</h2>
          <p>
            La base de données est corrompu trouver un moyen de stocker les données de manière sécurisée.
          </p>
          <div className="puzzle-instructions">
            <div class="database-error">
              <img src={errorImg} alt="database-error"/>
            </div>
            {/* Nœuds autour */}
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
    </div>
  );
}
