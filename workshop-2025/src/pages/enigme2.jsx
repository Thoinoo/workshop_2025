import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Enigme2() {
  const navigate = useNavigate();
  const { username, players, chat, timerRemaining, sendMessage } = useRoomState();

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme2" />
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={timerRemaining} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, restez concentré pour franchir ce nouvel obstacle.
              </>
            ) : (
              "Consolidez votre stratégie pour attaquer l'énigme numéro deux."
            )}
          </p>
          <h2>Énigme 2</h2>
          <p>
            Le réseau ennemi brouille les communications. Rassemblez les fragments d'informations
            et reconstruisez le message caché avant que la connexion ne soit perdue.
          </p>

          <div className="puzzle-instructions">
            <h3>Objectifs</h3>
            <ul>
              <li>Identifiez les séquences qui se répètent dans les transmissions.</li>
              <li>Associez chaque symbole à son code couleur pour révéler le message.</li>
              <li>Validez votre hypothèse auprès du maître du jeu pour passer à l'étape suivante.</li>
            </ul>
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
