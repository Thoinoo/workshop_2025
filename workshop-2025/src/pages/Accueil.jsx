import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDuration, formatOrdinal } from "../utils/formatting";
import "./lobby.css";
import bitcoinFire from "../assets/bitcoin_fire.png";

const MODE_JOIN = "join";
const MODE_CREATE = "create";

const generateRoomCode = () => String(Math.floor(1000 + Math.random() * 9000));

const joinPlayers = (players) =>
  Array.isArray(players)
    ? players
        .filter((name) => typeof name === "string" && name.trim())
        .slice(0, 4)
        .join(", ")
    : "";

export default function Accueil() {
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useState("");
  const [mode, setMode] = useState(MODE_CREATE);
  const [joinRoom, setJoinRoom] = useState("");
  const [createRoom, setCreateRoom] = useState(() => generateRoomCode());
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      if (cancelled) {
        return;
      }
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const response = await fetch("/api/leaderboard?limit=10");
        if (!response.ok) {
          throw new Error("Impossible de recuperer le leaderboard");
        }
        const data = await response.json();
        if (!cancelled) {
          setLeaderboard(Array.isArray(data.entries) ? data.entries : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLeaderboardError(error.message || "Impossible de recuperer le leaderboard");
        }
      } finally {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const canSubmitJoin = useMemo(
    () => pseudo.trim().length > 0 && joinRoom.trim().length === 4,
    [pseudo, joinRoom]
  );

  const canSubmitCreate = useMemo(
    () => pseudo.trim().length > 0 && createRoom.trim().length === 4,
    [pseudo, createRoom]
  );

  const persistIdentity = (roomCode, isHost) => {
    sessionStorage.setItem("pseudo", pseudo.trim());
    sessionStorage.setItem("room", roomCode.trim());
    sessionStorage.setItem("isHost", isHost ? "true" : "false");
    sessionStorage.setItem("missionStarted", "false");
    sessionStorage.setItem("missionFailed", "false");
    sessionStorage.setItem("missionCompleted", "false");
    sessionStorage.removeItem("missionElapsedSeconds");
    sessionStorage.removeItem("missionStartTimestamp");
    sessionStorage.removeItem("leaderboardEntry");
  };

  const handleJoinSubmit = (event) => {
    event?.preventDefault();
    if (!canSubmitJoin) {
      return;
    }

    persistIdentity(joinRoom, false);
    navigate("/preparation");
  };

  const handleCreateSubmit = (event) => {
    event?.preventDefault();
    if (!canSubmitCreate) {
      return;
    }

    persistIdentity(createRoom, true);
    navigate("/preparation");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === MODE_CREATE && createRoom.trim().length === 0) {
      setCreateRoom(generateRoomCode());
    }
  };

  const handleRegenerate = () => {
    setCreateRoom(generateRoomCode());
  };

  return (
    <div className="game-page home-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room">CRYPTO BREAKDOWN</p>
          <p className="game-username">
            Sauvez la Blockchain !
          </p>
        </div>
        <div className="game-header-section game-header-section--actions">
          <img src={bitcoinFire} alt="Bitcoin en feu" className="home-hero-image" />
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">
          <div className="home-toggle">
            <button
              type="button"
              className={`home-toggle__option ${mode === MODE_JOIN ? "is-active" : ""}`}
              onClick={() => handleModeChange(MODE_JOIN)}
            >
              Rejoindre
            </button>
            <button
              type="button"
              className={`home-toggle__option ${mode === MODE_CREATE ? "is-active" : ""}`}
              onClick={() => handleModeChange(MODE_CREATE)}
            >
              Creer
            </button>
          </div>
          <h2>{mode === MODE_JOIN ? "Rejoindre une salle" : "Créer une salle"}</h2>
          <p>
            {mode === MODE_JOIN
              ? "Entrez le code de salle communiqué par votre controleur pour integrer l'équipe déjà en place."
              : "Lancez une mission et appeler vos agents !"}
          </p>

          <form
            className="lobby-form"
            onSubmit={mode === MODE_JOIN ? handleJoinSubmit : handleCreateSubmit}
          >
            <label>
              Pseudo
              <input
                className="lobby-input"
                placeholder="Nom de code"
                value={pseudo}
                onChange={(event) => setPseudo(event.target.value)}
              />
            </label>

            {mode === MODE_JOIN ? (
              <label>
                Code de salle
                <input
                  className="lobby-input"
                  placeholder="Ex : 4521"
                  value={joinRoom}
                  onChange={(event) =>
                    setJoinRoom(event.target.value.replace(/\D+/g, "").slice(0, 4))
                  }
                />
              </label>
            ) : (null
            )}

            <button
              type="submit"
              className="game-primary"
              disabled={mode === MODE_JOIN ? !canSubmitJoin : !canSubmitCreate}
            >
              {mode === MODE_JOIN ? "Rejoindre la mission" : "Creer la salle"}
            </button>
          </form>
        </section>

        <aside className="chat-panel">
          {/* <div className="puzzle-instructions">
            <h3>Briefing express</h3>
            <ul>
              <li>Verifiez votre micro et votre connexion avant d'entrer.</li>
              <li>Partagez le code de salle a chaque membre de l'equipe.</li>
              <li>Le chronometre ne partira qu'une fois la mission lancee.</li>
            </ul>
          </div> */}

          <div className="lobby-insight">
            {/* <h3>Astuce</h3> */}
            <p>
              Devenez les meilleurs agents !
            </p>
          </div>

          <div className="leaderboard-card">
            <div className="leaderboard__header">
              <h3>Classement</h3>
            </div>
            {leaderboardError ? (
              <p className="leaderboard__error">{leaderboardError}</p>
            ) : null}
            {leaderboardLoading ? (
              <p className="leaderboard__loading">Chargement…</p>
            ) : null}
            {!leaderboardLoading && !leaderboardError ? (
              leaderboard.length ? (
                <ol className="leaderboard leaderboard--compact">
                  {leaderboard.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="leaderboard__item">
                      <span className="leaderboard__rank">{formatOrdinal(entry.rank)}</span>
                      <span className="leaderboard__team">
                        <strong>{entry.teamName}</strong>
                        <span className="leaderboard__members">{joinPlayers(entry.players)}</span>
                      </span>
                      <span className="leaderboard__time">{formatDuration(entry.elapsedSeconds)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="leaderboard__empty">Aucun temps enregistré pour le moment.</p>
              )
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
