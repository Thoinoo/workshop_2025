import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";

export default function Jeu() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage } = useRoomState();

  return (
    <div className="game-page">
      <header className="game-header">
        <div>
          <p className="game-room">Salle {room}</p>
          {username && <p className="game-username">Connecté en tant que <strong>{username}</strong></p>}
        </div>
        <BombeTimer remainingSeconds={timerRemaining} />
        <button className="game-primary" onClick={() => navigate("/enigme1")}>
          Accéder à l'énigme 1
        </button>
        <button className="game-primary" onClick={() => navigate("/enigme3")}>
          Accéder à l'énigme 3
        </button>
        <button className="game-primary" onClick={() => navigate("/enigme4")}>
          Accéder à l'énigme 4
        </button>
      </header>

      <div className="game-layout">
        <section className="game-card">
          <h2>Prêt pour la prochaine étape ?</h2>
          <p>
            Communiquez avec votre équipe dans le chat pour élaborer une stratégie et
            plongez-vous ensuite dans la première énigme.
          </p>
          <button className="game-secondary" onClick={() => navigate("/enigme1")}>
            Démarrer l'énigme 1
          </button>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
