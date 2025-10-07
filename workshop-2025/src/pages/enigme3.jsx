import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import { getEnigmesProgress, setEnigmeStatus } from "../utils/enigmesProgress";
import socket from "../socket";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";

export default function Enigme3() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme3", room);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const handleDebugComplete = () => {
    if (!room || isCompleted) {
      return;
    }
    setEnigmeStatus(room, "enigme3", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme3", completed: true });
    setFeedback({ type: "success", message: "Enigme validee (debug)." });
  };

  useEffect(() => {
    if (!missionStarted && !missionFailed) {
      navigate("/preparation", { replace: true });
    }
  }, [missionFailed, missionStarted, navigate]);

  useEffect(() => {
    if (missionFailed && location.pathname !== "/defaite") {
      navigate("/defaite", { replace: true });
    }
  }, [location.pathname, missionFailed, navigate]);

  const handleSubmit = () => {
    const normalized = answer.trim().toLowerCase();

    if (normalized === "banque") {
      const alreadyCompleted = Boolean(getEnigmesProgress(room)?.enigme3);
      if (!alreadyCompleted) {
        setEnigmeStatus(room, "enigme3", true);
        if (room) {
          socket.emit("enigmeStatusUpdate", { room, key: "enigme3", completed: true });
        }
      }
      setFeedback({ type: "success", message: "Reponse correcte ! Enigme validee." });
      setAnswer("");
    } else {
      setFeedback({ type: "error", message: "Ce n'est pas la bonne reponse. Essayez encore." });
    }
  };

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme3" room={room} />
        </div>
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
          {!isCompleted ? (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l enigme (debug)
            </button>
          ) : null}
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
          <h2>Enigme 3</h2>
          {isCompleted ? (
            <div className="enigme-post-completion">
              écrire ici les informations post réussite de l'énigme
            </div>
          ) : null}

          <p>
            Sur le premier coffre : "J'avais 10 pieces, j'en perds 8."<br />
            Sur le deuxieme coffre : "J'ai 5 billets, je les partage : 5 a 5."<br />
            Sur le troisieme coffre : "J'achete 2 lingots a 7 pieces chacun."<br />
            Sur le quatrieme coffre : "Je cache 20 lingots, mais on m'en retrouve 3."<br />
            Sur le cinquieme coffre : "Je trouve 3 sacs de 7 pieces chacun."<br />
            Sur le sixieme coffre : "J'avais 12 pieces, j'en donne 7."<br />
            <strong>Indice :</strong> Nous recherchons un mot.
          </p>

          <div className="reponse-zone">
            <input
              type="text"
              placeholder="Ecris le mot secret"
              className="reponse-input"
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                if (feedback) {
                  setFeedback(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button className="reponse-button" onClick={handleSubmit}>
              REPONSE
            </button>
          </div>
          {feedback ? (
            <p
              className={`reponse-feedback ${
                feedback.type === "success" ? "reponse-feedback--success" : "reponse-feedback--error"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
