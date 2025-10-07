import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Jeu() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage, missionStarted } =
    useRoomState();

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu />
          <p className="game-room">Salle {room}</p>
        </div>
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/")}>
            Retour a l'accueil
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">

          <h2>ALERTE CRITIQUE — Effondrement du système blockchain universel !</h2>
          <p>
            Ingénieurs du futur,
vous êtes notre dernière ligne de défense numérique.
Le cœur du réseau mondial de la blockchain vient d’imploser :
des blocs entiers ont disparu, d’autres sont corrompus par une anomalie inconnue.
Les transactions s’effacent une à une, les cryptomonnaies fondent dans le néant.
Si rien n’est fait, la confiance numérique mondiale s’effondrera.

Votre mission : reconstruire la blockchain, bloc après bloc.
Chaque énigme que vous résoudrez restaurera une partie de son architecture —
le Genesis Block, les liens cryptographiques, le consensus du réseau, et enfin, la clé maîtresse.

Réussissez… et vous sauverez l’économie numérique mondiale.
Échouez… et tout ce que le monde possède deviendra poussière de données.

⚠️ Le compte à rebours est lancé.
Réparez la blockchain. Rétablissez la confiance. Sauvez le futur. 💾
<p>
Cliquez sur la sélection des énigmes en haut à gauche pour commencer !
</p>
          </p>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
