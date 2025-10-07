import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useRoomState from "../hooks/useRoomState";
import { getAvatarById } from "../constants/avatars";
import { formatDuration } from "../utils/formatting";
import BombeTimer from "../components/BombeTimer";
import "./lobby.css";

const buildPlayerSummary = (names) => {
  if (!Array.isArray(names) || !names.length) {
    return "aucun agent connecte";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} et ${names[1]}`;
  }
  return `${names[0]} et ${names.length - 1} autres`;
};

export default function Defeat() {
  const navigate = useNavigate();
  const {
    room,
    players,
    missionStarted,
    missionFailed,
    missionElapsedSeconds,
    resetMission,
    isHost,
  } = useRoomState();

  useEffect(() => {
    if (!missionFailed) {
      navigate(missionStarted ? "/jeu" : "/preparation", { replace: true });
    }
  }, [missionFailed, missionStarted, navigate]);

  const playerNames = useMemo(
    () =>
      Array.isArray(players)
        ? players.map((player) => player?.username).filter(Boolean)
        : [],
    [players]
  );

  const formattedElapsed = useMemo(() => {
    if (!Number.isFinite(missionElapsedSeconds)) {
      return "Temps inconnu";
    }
    return formatDuration(missionElapsedSeconds);
  }, [missionElapsedSeconds]);

  return (
    <div className="game-page defeat-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room">Salle {room}</p>
          <p className="game-username">
            Mission avortee. Equipe impliquee : {buildPlayerSummary(playerNames)}.
          </p>
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={0} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/preparation")}>
            Retour au QG
          </button>
          {isHost ? (
            <button className="game-primary" onClick={resetMission}>
              Relancer une mission
            </button>
          ) : null}
        </div>
      </header>

      <main className="defeat-layout">
        <section className="game-card defeat-card">
          <h1>Mission echouee</h1>
          <p className="defeat-subtitle">
            Le reseau blockchain s&apos;est effondre avant la restauration complete. Analyse de
            l&apos;incident :
          </p>

          <div className="defeat-metrics">
            <div className="defeat-metric">
              <span className="defeat-metric__label">Temps ecoule</span>
              <span className="defeat-metric__value">{formattedElapsed}</span>
            </div>
            <div className="defeat-metric">
              <span className="defeat-metric__label">Statut</span>
              <span className="defeat-metric__value defeat-metric__value--down">
                Blockchain hors service
              </span>
            </div>
          </div>

          <div className="defeat-players">
            <h2 className="defeat-players__title">Agents en mission</h2>
            <div className="defeat-avatars">
              {Array.isArray(players) && players.length ? (
                players.map((player, index) => {
                  const username = player?.username || `agent-${index + 1}`;
                  const avatarMeta = getAvatarById(player?.avatar);
                  return (
                    <figure key={username} className="defeat-avatar">
                      <span className="defeat-avatar__frame" aria-hidden="true">
                        {avatarMeta ? (
                          <img src={avatarMeta.src} alt="" />
                        ) : (
                          <span className="defeat-avatar__placeholder">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <figcaption className="defeat-avatar__name">{username}</figcaption>
                    </figure>
                  );
                })
              ) : (
                <p className="defeat-avatars__empty">
                  Aucun agent n&apos;etait connecte lors du crash.
                </p>
              )}
            </div>
          </div>

          <div className="defeat-next-steps">
            <h2>Prochaine tentative</h2>
            <p>
              Recapitulez vos decouvertes, adaptez votre strategie et relancez une nouvelle mission.
              Le reseau mondial depend de votre perseverance.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
