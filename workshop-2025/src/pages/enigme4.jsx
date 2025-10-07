import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import "./enigme4.css";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";

export default function Enigme4() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage, missionStarted } =
    useRoomState();

  // Drag & Drop des palettes
  useEffect(() => {
    const palettes = document.querySelectorAll(".palette");
    const zones = document.querySelectorAll(".dropzone");

    const dragHandlers = new Map();
    const dropHandlers = new Map();
    const dragOverHandlers = new Map();

    palettes.forEach((palette) => {
      const handleDragStart = (event) => {
        event.dataTransfer.setData("text", palette.textContent);
      };
      dragHandlers.set(palette, handleDragStart);
      palette.addEventListener("dragstart", handleDragStart);
    });

    zones.forEach((zone) => {
      const handleDragOver = (event) => event.preventDefault();
      const handleDrop = (event) => {
        event.preventDefault();
        const item = event.dataTransfer.getData("text");
        const palette = [...palettes].find((p) => p.textContent === item);
        if (palette) {
          zone.appendChild(palette);
        }
      };

      dragOverHandlers.set(zone, handleDragOver);
      dropHandlers.set(zone, handleDrop);

      zone.addEventListener("dragover", handleDragOver);
      zone.addEventListener("drop", handleDrop);
    });

    return () => {
      dragHandlers.forEach((handler, element) => {
        element.removeEventListener("dragstart", handler);
      });

      dragOverHandlers.forEach((handler, element) => {
        element.removeEventListener("dragover", handler);
      });

      dropHandlers.forEach((handler, element) => {
        element.removeEventListener("drop", handler);
      });
    };
  }, []);

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme4" room={room} />
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
              "Preparez-vous a resoudre la prochaine enigme."
            )}
          </p>
          <h2>Enigme 4</h2>

          <div className="container">
            <h1>Logistique : repartissez les palettes correctement</h1>
            <h2>
              Glissez les palettes dans les bons camions selon la destination. Attention, une
              mauvaise repartition declenche l'alarme&nbsp;!
            </h2>

            <div id="logistique-jeu">
              <div className="clients">
                <div className="client">
                  <div className="client-label">Client A</div>
                  <div className="palettes">
                    <div className="palette" draggable="true">
                      A1
                    </div>
                    <div className="palette" draggable="true">
                      A2
                    </div>
                  </div>
                </div>
                <div className="client">
                  <div className="client-label">Client B</div>
                  <div className="palettes">
                    <div className="palette" draggable="true">
                      B1
                    </div>
                    <div className="palette" draggable="true">
                      B2
                    </div>
                  </div>
                </div>
              </div>

              <div className="camions">
                <div className="camion">
                  <div className="camion-label">Camion Nord</div>
                  <div className="dropzone" id="zone-nord"></div>
                </div>
                <div className="camion">
                  <div className="camion-label">Camion Sud</div>
                  <div className="dropzone" id="zone-sud"></div>
                </div>
              </div>
            </div>

            <div className="input-area">
              <input type="text" id="reponse" placeholder="Entrez votre mot de passe" />
              <button onClick={() => alert("Validation a implementer")}>Valider</button>
            </div>

            <p id="resultat"></p>
          </div>

          <div id="explosion-overlay" style={{ display: "none" }}></div>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
