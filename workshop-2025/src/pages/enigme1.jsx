import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";

export default function Enigme1() {
  const navigate = useNavigate();
  const { username, players, chat, timerRemaining, sendMessage } = useRoomState();

  return (
    <div className="game-page">
      <header className="game-header">
        <div>
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, décryptez les indices pour progresser vers la
                prochaine étape.
              </>
            ) : (
              "Préparez-vous à résoudre la première énigme."
            )}
          </p>
        </div>

        <BombeTimer remainingSeconds={timerRemaining} />

        <button className="game-secondary" onClick={() => navigate("/jeu")}>Retour au lobby</button>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Énigme 1 🔍</h2>
          <p>
            Observez attentivement les éléments fournis par votre maître du jeu. Chaque détail
            compte et l'échange d'idées avec votre équipe sera déterminant.
          </p>

          <div className="puzzle-instructions">
            <h3>Briefing</h3>
            <ul>
              <li>Partagez vos découvertes dans le chat pour faire progresser l'équipe.</li>
              <li>Notez les indices importants et confrontez vos hypothèses.</li>
              <li>Lorsque vous êtes prêts, contactez le maître du jeu pour valider votre réponse.</li>
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
