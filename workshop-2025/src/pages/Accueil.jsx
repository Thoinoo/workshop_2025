import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./lobby.css";

const MODE_JOIN = "join";
const MODE_CREATE = "create";

const generateRoomCode = () => String(Math.floor(1000 + Math.random() * 9000));

export default function Accueil() {
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useState("");
  const [mode, setMode] = useState(MODE_JOIN);
  const [joinRoom, setJoinRoom] = useState("");
  const [createRoom, setCreateRoom] = useState(() => generateRoomCode());

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
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room">Bienvenue dans l'escape game</p>
          <p className="game-username">
            Choisissez votre couverture d'agent, puis creez une nouvelle mission ou rejoignez votre
            equipe pour la lancer.
          </p>
        </div>
        <div className="game-header-section game-header-section--timer">
          <div className="home-code-badge">Crypto breakdown</div>
        </div>
        <div className="game-header-section game-header-section--actions">
          
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
          <h2>{mode === MODE_JOIN ? "Rejoindre une salle" : "Creer une salle"}</h2>
          <p>
            {mode === MODE_JOIN
              ? "Entrez le code de salle communique par votre controleur pour integrer l'equipe deja en place."
              : "Un code de salle unique est genere pour vous. Partagez-le avec l'equipe avant de lancer la mission."}
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
            ) : null}

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
          <div className="puzzle-instructions">
            <h3>Briefing express</h3>
            <ul>
              <li>Verifiez votre micro et votre connexion avant d'entrer.</li>
              <li>Partagez le code de salle a chaque membre de l'equipe.</li>
              <li>Le chronometre ne partira qu'une fois la mission lancee.</li>
            </ul>
          </div>

          <div className="lobby-insight">
            <h3>Astuce</h3>
            <p>
              En tant qu'hote, vous pourrez attendre vos coequipiers sur l'ecran de prepartie avant
              de lancer le compteur.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
