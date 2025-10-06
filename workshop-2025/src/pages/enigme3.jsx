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
                Agent <strong>{username}</strong>, dǸcryptez les indices pour progresser vers la
                prochaine Ǹtape.
              </>
            ) : (
              "PrǸparez-vous �� rǸsoudre la premi��re Ǹnigme."
            )}
          </p>
        </div>
        <BombeTimer remainingSeconds={timerRemaining} />
        <button className="game-secondary" onClick={() => navigate("/jeu")}>Retour au lobby</button>
      </header>

      <div className="game-layout">
      <section className="game-card puzzle-content">

  <h2>�%nigme 3 �Y'�</h2>

  <p>
    Sur le premier coffre : �� J�?Tavais 10 pi��ces, j�?Ten perds 8. ��<br />
    Sur le deuxi��me coffre : �� J�?Tai 5 billets, je les partage : 5 �� 5. ��<br />
    Sur le troisi��me coffre : �� J�?Tach��te 2 lingots �� 7 pi��ces chacun. ��<br />
    Sur le quatri��me coffre : �� Je cache 20 lingots, mais on m�?Ten retrouve 3. ��<br />
    Sur le cinqui��me coffre : �� Je trouve 3 sacs de 7 pi��ces chacun. ��<br />
    Sur le sixi��me coffre : �� J�?Tavais 12 pi��ces, j�?Ten donne 7. ��<br />
    <strong>Indice :</strong> Nous recherchons un mot.
  </p>

  <div className="reponse-zone">
    <input
      type="text"
      placeholder="�%cris le mot secret"
      className="reponse-input"
    />
    <button
      className="reponse-button"
      onClick={() => alert("VǸrification de la rǸponse (�� implǸmenter)")}
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
