import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useRoomState from "../hooks/useRoomState";
import { getAvatarById } from "../constants/avatars";
import "./lobby.css";

const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds < 0) {
    return "--:--";
  }
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function Victory() {
  const navigate = useNavigate();
  const {
    room,
    players,
    missionStarted,
    missionCompleted,
    missionElapsedSeconds,
    resetMission,
    isHost,
    allEnigmesCompleted,
  } = useRoomState();

  useEffect(() => {
    if (!missionCompleted && !allEnigmesCompleted) {
      navigate(missionStarted ? "/jeu" : "/preparation", { replace: true });
    }
  }, [allEnigmesCompleted, missionCompleted, missionStarted, navigate]);

  const formattedTime = useMemo(
    () => formatDuration(missionElapsedSeconds),
    [missionElapsedSeconds]
  );

  return (
    <div className="game-page victory-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room">Salle {room}</p>
          <p className="game-username">
            Mission accomplie ! Chaque bloc a ete restaure et la blockchain respire de nouveau.
          </p>
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au QG
          </button>
          {isHost ? (
            <button className="game-primary" onClick={resetMission}>
              Relancer une mission
            </button>
          ) : null}
        </div>
      </header>

      <main className="victory-layout">
        <section className="game-card victory-card">
          <h1>Victoire !</h1>
          <p className="victory-subtitle">
            Vous avez reconstitue l&apos;integrite du registre. Analyse du deploiement :
          </p>

          <div className="victory-metrics">
            <div className="victory-metric">
              <span className="victory-metric__label">Temps total</span>
              <span className="victory-metric__value">{formattedTime}</span>
            </div>
            <div className="victory-metric">
              <span className="victory-metric__label">Statut</span>
              <span className="victory-metric__value victory-metric__value--success">
                Blockchain stabilisee
              </span>
            </div>
          </div>

          <div className="victory-players">
            <h2 className="victory-players__title">Equipes ayant participe</h2>
            <div className="victory-avatars">
              {players && players.length ? (
                players.map((player, index) => {
                  const username = player?.username || `agent-${index + 1}`;
                  const avatarMeta = getAvatarById(player?.avatar);
                  return (
                    <figure key={username} className="victory-avatar">
                      <span className="victory-avatar__frame" aria-hidden="true">
                        {avatarMeta ? (
                          <img src={avatarMeta.src} alt="" />
                        ) : (
                          <span className="victory-avatar__placeholder">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <figcaption className="victory-avatar__name">{username}</figcaption>
                    </figure>
                  );
                })
              ) : (
                <p className="victory-avatars__empty">Les agents se deconnectent...</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
