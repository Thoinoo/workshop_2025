import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Jeu() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage, missionStarted } =
    useRoomState();

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu />
          <p className="game-room">Salle {room}</p>
        </div>
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/")}>
            Retour a l'accueil
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">
          {username ? (
            <p className="game-username">
              Agent <strong>{username}</strong>, coordonnez votre equipe avant de lancer une nouvelle
              enigme.
            </p>
          ) : (
            <p className="game-username">
              Preparez votre equipe et choisissez l'enigme ideale pour debuter la mission.
            </p>
          )}
          <h2>Pret pour la prochaine etape&nbsp;?</h2>
          <p>
            Communiquez avec votre equipe dans le chat pour elaborer une strategie avant de vous
            lancer sur l'enigme de votre choix.
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
