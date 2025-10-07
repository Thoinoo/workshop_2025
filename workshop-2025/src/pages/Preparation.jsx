import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import "./lobby.css";

export default function Preparation() {
  const navigate = useNavigate();
  const {
    username,
    room,
    players,
    chat,
    sendMessage,
    timerRemaining,
    isHost,
    missionStarted,
    startMission,
  } = useRoomState();

  const infoMessage = useMemo(() => {
    if (players.length <= 1) {
      return "En attente de vos coequipiers. Partagez le code de salle pour les inviter avant de lancer la mission.";
    }
    if (isHost) {
      return "Tout le monde est la ? Vous pouvez lancer la mission lorsque l'equipe est prete.";
    }
    return "L'hote demarrera la mission des que l'equipe est au complet. Restez a l'ecoute.";
  }, [isHost, players.length]);

  useEffect(() => {
    if (missionStarted) {
      navigate("/jeu");
    }
  }, [missionStarted, navigate]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room">Salle {room}</p>
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, nous attendons l'equipe avant de declencher le compte a rebours.
              </>
            ) : (
              "Temps de preparation en cours."
            )}
          </p>
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>

        <div className="game-header-section game-header-section--actions">
          {isHost ? (
            <button className="game-primary" onClick={startMission} disabled={missionStarted}>
              Lancer la mission
            </button>
          ) : (
            <span className="home-code-badge">En attente du lancement</span>
          )}
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">
          <h2>Briefing de prepartie</h2>
          <p>{infoMessage}</p>

          <div className="puzzle-instructions">
            <h3>Checklist</h3>
            <ul>
              <li>Confirmez que tous les agents sont connectes et entendent le canal vocal.</li>
              <li>Partagez les directives speciales ou les roles avant de lancer la mission.</li>
              <li>Assurez-vous que chacun connait le code de salle en cas de reconnexion.</li>
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
