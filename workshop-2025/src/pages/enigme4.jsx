import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import socket from "../socket";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import "./enigme4.css";

export default function Enigme4() {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("pseudo");
  const room = sessionStorage.getItem("room");

  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState(() => {
    try {
      const stored = sessionStorage.getItem("chatHistory");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Unable to read chat history from sessionStorage", error);
      return [];
    }
  });

  // 🔹 Connexion socket et chat
  useEffect(() => {
    if (!username || !room) {
      navigate("/");
      return;
    }

    socket.emit("joinRoom", { username, room });
    socket.on("playersUpdate", setPlayers);
    socket.on("newMessage", (msg) =>
      setChat((prev) => {
        const updated = [...prev, msg];
        try {
          sessionStorage.setItem("chatHistory", JSON.stringify(updated));
        } catch (error) {
          console.error("Unable to persist chat history in sessionStorage", error);
        }
        return updated;
      })
    );

    return () => {
      socket.off("playersUpdate");
      socket.off("newMessage");
    };
  }, [navigate, room, username]);

  useEffect(() => {
    try {
      sessionStorage.setItem("chatHistory", JSON.stringify(chat));
    } catch (error) {
      console.error("Unable to persist chat history in sessionStorage", error);
    }
  }, [chat]);

  const sendMessage = (content) => {
    const trimmed = content.trim();
    if (trimmed) {
      socket.emit("chatMessage", { room, username, message: trimmed });
    }
  };

  // 🔹 Gestion Drag & Drop palettes
  useEffect(() => {
    const palettes = document.querySelectorAll(".palette");
    const zones = document.querySelectorAll(".dropzone");

    palettes.forEach((p) => {
      p.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text", p.textContent);
      });
    });

    zones.forEach((z) => {
      z.addEventListener("dragover", (e) => e.preventDefault());
      z.addEventListener("drop", (e) => {
        e.preventDefault();
        const item = e.dataTransfer.getData("text");
        const palette = [...palettes].find((p) => p.textContent === item);
        if (palette) z.appendChild(palette);
      });
    });

    // ✅ Nettoyage des listeners à la sortie
    return () => {
      palettes.forEach((p) => p.replaceWith(p.cloneNode(true)));
      zones.forEach((z) => z.replaceWith(z.cloneNode(true)));
    };
  }, []);

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

        <BombeTimer startSeconds={600} />
        <button className="game-secondary" onClick={() => navigate("/jeu")}>
          Retour au lobby
        </button>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Énigme 4 💣</h2>

          <div className="container">
            <h1>Logistique : répartissez les palettes correctement</h1>
            <h2>
              Glissez les palettes dans les bons camions selon la destination.
              Attention, une mauvaise répartition déclenche l’alarme !
            </h2>

            <div id="logistique-jeu">
              <div className="clients">
                <div className="client">
                  <div className="client-label">Client A</div>
                  <div className="palettes">
                    <div className="palette" draggable="true">A1</div>
                    <div className="palette" draggable="true">A2</div>
                  </div>
                </div>
                <div className="client">
                  <div className="client-label">Client B</div>
                  <div className="palettes">
                    <div className="palette" draggable="true">B1</div>
                    <div className="palette" draggable="true">B2</div>
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
              <button onClick={() => alert("Validation à implémenter")}>Valider</button>
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
