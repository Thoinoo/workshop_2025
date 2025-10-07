import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Enigme1() {
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
          <EnigmesGridMenu active="enigme1" />
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
                Agent <strong>{username}</strong>, decryptez les indices pour progresser vers la
                prochaine etape.
              </>
            ) : (
              "Preparez-vous a resoudre la premiere enigme."
            )}
          </p>
          <h2>Enigme 1</h2>
          <p>
            Observez attentivement les elements fournis par votre maitre du jeu. Chaque detail
            compte et l'echange d'idees avec votre equipe sera determinant.
          </p>

          <div className="puzzle-instructions">
            <h3>Briefing</h3>
            <ul>
              <li>Partagez vos decouvertes dans le chat pour faire progresser l'equipe.</li>
              <li>Notez les indices importants et confrontez vos hypotheses.</li>
              <li>
                Lorsque vous etes prets, contactez le maitre du jeu pour valider votre reponse.
              </li>
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
