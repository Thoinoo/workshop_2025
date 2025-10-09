import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import ToolsMenu from "../components/ToolsMenu";

const TITLE_TEXT = "ALERTE CRITIQUE — Effondrement du système blockchain universel !";

const MESSAGE_TEXT = [
  "Ingénieurs du futur, vous êtes notre dernière ligne de défense numérique.",
  "Le cœur du réseau mondial de la blockchain vient d’imploser : des blocs entiers ont disparu, d’autres sont corrompus par une anomalie inconnue.",
  "Les transactions s’effacent une à une, les cryptomonnaies fondent dans le néant. Si rien n’est fait, la confiance numérique mondiale s’effondrera.",
  "Votre mission : reconstruire la blockchain, bloc après bloc. Chaque énigme que vous résolvez restaure son architecture : le bloc Genesis, les liens cryptographiques, le consensus du réseau, et enfin la clé maîtresse.",
  "Réussissez et vous sauverez l’économie numérique mondiale. Échouez et tout deviendra poussière de données.",
  "Le compte à rebours est lancé. Réparez la blockchain. Rétablissez la confiance. Sauvez le futur.",
  "Cliquez sur la sélection des énigmes en haut à gauche pour commencer !",
].join("\n\n");

const TYPE_SPEED_TITLE = 35;
const TYPE_SPEED_MESSAGE = 20;

export default function Jeu() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [titleCompleted, setTitleCompleted] = useState(false);

  useEffect(() => {
    if (!missionStarted && !missionFailed) {
      navigate("/preparation", { replace: true });
    }
  }, [missionFailed, missionStarted, navigate]);

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
    <div className="game-page game-page--fixed-header">
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
            Retour à l’accueil
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
          <ToolsMenu />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
