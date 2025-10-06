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
                Agent <strong>{username}</strong>, d\u00E9cryptez les indices pour progresser vers la
                prochaine \u00E9tape.
              </>
            ) : (
              "Pr\u00E9parez-vous \u00E0 r\u00E9soudre la premi\u00E8re \u00E9nigme."
            )}
          </p>
        </div>
        <BombeTimer remainingSeconds={timerRemaining} />
        <button className="game-secondary" onClick={() => navigate("/jeu")}>Retour au lobby</button>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>\u00C9nigme 3</h2>

          <p>
            Sur le premier coffre : "J'avais 10 pi\u00E8ces, j'en perds 8."<br />
            Sur le deuxi\u00E8me coffre : "J'ai 5 billets, je les partage : 5 \u00E0 5."<br />
            Sur le troisi\u00E8me coffre : "J'ach\u00E8te 2 lingots \u00E0 7 pi\u00E8ces chacun."<br />
            Sur le quatri\u00E8me coffre : "Je cache 20 lingots, mais on m'en retrouve 3."<br />
            Sur le cinqui\u00E8me coffre : "Je trouve 3 sacs de 7 pi\u00E8ces chacun."<br />
            Sur le sixi\u00E8me coffre : "J'avais 12 pi\u00E8ces, j'en donne 7."<br />
            <strong>Indice :</strong> Nous recherchons un mot.
          </p>

          <div className="reponse-zone">
            <input
              type="text"
              placeholder="\u00C9cris le mot secret"
              className="reponse-input"
            />
            <button
              className="reponse-button"
              onClick={() => alert("V\u00E9rification de la r\u00E9ponse (\u00E0 impl\u00E9menter)")}
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
