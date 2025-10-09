import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import btcCounterImage from "../assets/btc_counter.png";
import enigmGridImage from "../assets/enigm_grid.png";
import { AVATARS, getAvatarById } from "../constants/avatars";
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
    avatar,
    updateAvatar,
  } = useRoomState();
  const selectedAvatar = getAvatarById(avatar);

  const infoMessage = useMemo(() => {
    if (players.length <= 1) {
      return "En attente de vos coéquipiers. Partagez le code de salle pour les inviter avant de lancer la mission.";
    }
    if (isHost) {
      return "Tout le monde est là ? Vous pouvez lancer la mission lorsque l’équipe est prête.";
    }
    return "L’hôte démarrera la mission dès que l’équipe est au complet. Restez à l’écoute.";
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
          <p className="game-room game-room--blink">Salle {room}</p>
          
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, nous attendons l’équipe avant de déclencher le compte à rebours.
              </>
            ) : (
              "Temps de préparation en cours."
            )}
          </p>
        </div>

        {/* <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={timerRemaining} />
        </div> */}

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
          <h2>Transmission prioritaire : RASSEMBLEMENT DES AGENTS</h2>

          <div>
          <h4>Numéro de salle — appelez des renforts</h4>
            <p>
              En haut à gauche, votre numéro de salle clignote : c’est le seul canal pour appeler d’autres ingénieurs. Partagez‑le maintenant. Chaque nouvelle paire d’yeux et de cerveaux augmente vos chances de réparer la chaîne avant l’ultime effondrement.
            </p>

            

            

            <h4>Choisissez votre avatar</h4>
            <p>
              Identifiez‑vous visuellement pour votre escouade. Sélectionnez un avatar pour qu’il s’affiche auprès de vos coéquipiers.
            </p>
            <div className="avatar-selector">
              {AVATARS.map(({ id, src, label }) => {
                const isSelected = id === avatar;
                return (
                  <button
                    key={id}
                    type="button"
                    className={["avatar-selector__choice", isSelected ? "is-selected" : ""].join(" ").trim()}
                    onClick={() => updateAvatar(id)}
                    aria-pressed={isSelected}
                  >
                    <span className="avatar-selector__image">
                      <img src={src} alt={label} />
                    </span>
                    <span className="avatar-selector__label">{label}</span>
                  </button>
                );
              })}
            </div>

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
