import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";

export default function Enigme3() {
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
          <h2>Énigme 3</h2>

          <p>
            Sur le premier coffre : "J'avais 10 pièces, j'en perds 8."<br />
            Sur le deuxième coffre : "J'ai 5 billets, je les partage : 5 à 5."<br />
            Sur le troisième coffre : "J'achète 2 lingots à 7 pièces chacun."<br />
            Sur le quatrième coffre : "Je cache 20 lingots, mais on m'en retrouve 3."<br />
            Sur le cinquième coffre : "Je trouve 3 sacs de 7 pièces chacun."<br />
            Sur le sixième coffre : "J'avais 12 pièces, j'en donne 7."<br />
            <strong>Indice :</strong> Nous recherchons un mot.
          </p>

          <div className="reponse-zone">
            <input
              type="text"
              placeholder="Écris le mot secret"
              className="reponse-input"
            />
            <button
              className="reponse-button"
              onClick={() => alert("Vérification de la réponse (à implémenter)")}
            >
              REPONSE
            </button>
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
