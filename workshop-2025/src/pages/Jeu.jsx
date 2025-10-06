import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Jeu() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage } = useRoomState();

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu />
          <p className="game-room">Salle {room}</p>
        </div>
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={timerRemaining} />
        </div>
        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/")}>
            Retour à l'accueil
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">
          {username ? (
            <p className="game-username">
              Agent <strong>{username}</strong>, coordonnez votre équipe avant de lancer une nouvelle
              énigme.
            </p>
          ) : (
            <p className="game-username">
              Préparez votre équipe et choisissez l'énigme idéale pour débuter la mission.
            </p>
          )}
          <h2>Prêt pour la prochaine étape&nbsp;?</h2>
          <p>
            Communiquez avec votre équipe dans le chat pour élaborer une stratégie avant de vous
            lancer sur l'énigme de votre choix.
          </p>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
