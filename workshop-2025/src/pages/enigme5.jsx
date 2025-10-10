
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import EnigmePresence from "../components/EnigmePresence";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";
import socket from "../socket";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import ToolsMenu from "../components/ToolsMenu";
import MiningStepsGame from "../components/MiningStepsGame";

export default function Enigme5() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme5", room);
  const [puzzleSolved, setPuzzleSolved] = useState(false);

 
  const [helpPenalty, setHelpPenalty] = useState(0);

  const handleHelpUsed = useCallback(
    ({ totalPenaltySeconds, delta } = {}) => {
      setHelpPenalty((previous) => {
        if (Number.isFinite(totalPenaltySeconds)) {
          return totalPenaltySeconds;
        }
        const increment = Number.isFinite(delta) ? delta * 500 : 500;
        return previous + increment;
      });
    },
    []
  );

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

  useEffect(() => {
    if (isCompleted) {
      setPuzzleSolved(true);
    }
  }, [isCompleted]);

  const handleDebugComplete = () => {
    if (!room || isCompleted) return;
    setEnigmeStatus(room, "enigme5", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme5", completed: true });
  };

  const handlePuzzleComplete = useCallback(() => {
    if (puzzleSolved || isCompleted) return;

    setPuzzleSolved(true);
    if (room) {
      setEnigmeStatus(room, "enigme5", true);
      socket.emit("enigmeStatusUpdate", { room, key: "enigme5", completed: true });
    }
  }, [puzzleSolved, isCompleted, room]);

  return (
    <div className="game-page">
      <header className="game-header game-header--timer-detached">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme5" room={room} />
          <EnigmePresence players={players} scene="enigme5" />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
          {!isCompleted ? (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l énigme (debug)
            </button>
          ) : null}
        </div>
      </header>

      <div className="game-timer-sticky">
        <div className="game-header-section game-header-section--timer">
          {}
          <BombeTimer
            remainingSeconds={
              missionStarted ? Math.max(timerRemaining - helpPenalty, 0) : null
            }
          />
        </div>
      </div>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 5 - Le cycle du minage</h2>
          <p>
            Assemblez les 25 étapes du voyage d’une transaction pour reformer le bloc cible.
            La scène reste visible quelques secondes avant d’être mélangée : mémorisez-la puis
            replacez chaque pièce pour reconstituer l’ordre logique du minage.
          </p>
          <div className="puzzle-instructions">
            <ul>
              <li>Observez l’image complète avant le mélange.</li>
              <li>Glissez les pièces pour reconstituer la séquence correcte.</li>
              <li>Pointez une pièce pour afficher l’indice associé à l’étape.</li>
            </ul>
          </div>

          {}
          <MiningStepsGame
            room={room}
            onComplete={handlePuzzleComplete}
            onHelpUsed={handleHelpUsed}
            disabled={puzzleSolved}
          />

          {isCompleted ? (
            <div className="enigme-post-completion">
              Bloc reconstruit : le réseau valide la transaction et le cycle continue.
            </div>
          ) : null}
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <ToolsMenu />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>

      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
