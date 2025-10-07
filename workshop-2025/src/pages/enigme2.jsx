import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Enigme2() {
  const navigate = useNavigate();
  const { username, players, chat, timerRemaining, sendMessage, missionStarted } = useRoomState();

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

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
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, restez concentre pour franchir ce nouvel obstacle.
              </>
            ) : (
              "Consolidez votre strategie pour attaquer l'enigme numero deux."
            )}
          </p>
          <h2>Enigme 2</h2>
          <p>
            Le reseau ennemi brouille les communications. Rassemblez les fragments d'informations et
            reconstruisez le message cache avant que la connexion ne soit perdue.
          </p>

          <div className="puzzle-instructions">
            <h3>Objectifs</h3>
            <ul>
              <li>Identifiez les sequences qui se repetent dans les transmissions.</li>
              <li>Associez chaque symbole a son code couleur pour reveler le message.</li>
              <li>Validez votre hypothese aupres du maitre du jeu pour passer a l'etape suivante.</li>
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
