import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

const TITLE_TEXT = "ALERTE CRITIQUE - Effondrement du systeme blockchain universel !";

const MESSAGE_TEXT = [
  "Ingenieurs du futur, vous etes notre derniere ligne de defense numerique.",
  "Le coeur du reseau mondial de la blockchain vient d'imploser : des blocs entiers ont disparu, d'autres sont corrompus par une anomalie inconnue.",
  "Les transactions s'effacent une a une, les cryptomonnaies fondent dans le neant. Si rien n'est fait, la confiance numerique mondiale s'effondrera.",
  "Votre mission : reconstruire la blockchain, bloc apres bloc. Chaque enigme que vous resolvez restaure son architecture : le genesis block, les liens cryptographiques, le consensus du reseau, et enfin la cle maitresse.",
  "Reussissez et vous sauverez l'economie numerique mondiale. Echouez et tout deviendra poussiere de donnees.",
  "Le compte a rebours est lance. Reparez la blockchain. Retablissez la confiance. Sauvez le futur.",
  "Cliquez sur la selection des enigmes en haut a gauche pour commencer !",
].join("\n\n");

const TYPE_SPEED_TITLE = 35;
const TYPE_SPEED_MESSAGE = 20;

export default function Jeu() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted } = useRoomState();
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [titleCompleted, setTitleCompleted] = useState(false);

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

  useEffect(() => {
    let cancelled = false;

    setDisplayedTitle("");
    setTitleCompleted(false);

    if (typeof window === "undefined") {
      setDisplayedTitle(TITLE_TEXT);
      setTitleCompleted(true);
      return () => {};
    }

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      if (!cancelled) {
        setDisplayedTitle(TITLE_TEXT.slice(0, index));
      }

      if (index >= TITLE_TEXT.length) {
        window.clearInterval(intervalId);
        if (!cancelled) {
          setTitleCompleted(true);
        }
      }
    }, TYPE_SPEED_TITLE);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!titleCompleted) {
      return;
    }

    let cancelled = false;
    setDisplayedMessage("");

    if (typeof window === "undefined") {
      setDisplayedMessage(MESSAGE_TEXT);
      return () => {};
    }

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      if (!cancelled) {
        setDisplayedMessage(MESSAGE_TEXT.slice(0, index));
      }

      if (index >= MESSAGE_TEXT.length) {
        window.clearInterval(intervalId);
      }
    }, TYPE_SPEED_MESSAGE);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [titleCompleted]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu room={room} />
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
          <h2 aria-live="polite">{displayedTitle || "\u00A0"}</h2>
          <p className="typewriter-text" aria-live="polite">
            {displayedMessage || "\u00A0"}
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
