import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import "./lobby.css";

export default function Jeu() {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("pseudo");
  const room = sessionStorage.getItem("room");

  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState(() => {
    try {
      const stored = sessionStorage.getItem("chatHistory");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Unable to read chat history from sessionStorage", error);
      return [];
    }
  });

  useEffect(() => {
    if (!username || !room) {
        navigate("/");
        return () => {};
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

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("chatMessage", { room, username, message });
      setMessage("");
    }
  };

  return (
    <div className="game-page">
      <header className="game-header">
        <div>
          <p className="game-room">Salle {room}</p>
          {username && <p className="game-username">Connecté en tant que <strong>{username}</strong></p>}
        </div>
        <button className="game-primary" onClick={() => navigate("/enigme1")}>
          Accéder à l'énigme 1
        </button>
      </header>

      <div className="game-layout">
        <section className="game-card">
          <h2>Prêt pour la prochaine étape ?</h2>
          <p>
            Communiquez avec votre équipe dans le chat pour élaborer une stratégie et
            plongez-vous ensuite dans la première énigme.
          </p>
          <button className="game-secondary" onClick={() => navigate("/enigme1")}>
            Démarrer l'énigme 1
          </button>
        </section>

        <aside className="chat-panel">
          <div className="players-list">
            <h3>Participants</h3>
            <ul>
              {players.length > 0 ? (
                players.map((p, i) => <li key={i}>{p}</li>)
              ) : (
                <li className="empty-state">En attente d'autres joueurs…</li>
              )}
            </ul>
          </div>

          <div className="chat-box" role="log" aria-live="polite">
            {chat.length > 0 ? (
              chat.map((m, i) => (
                <div key={i} className="chat-message">
                  <span className="chat-author">{m.username}</span>
                  <span className="chat-text">{m.message}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Soyez le premier à lancer la conversation !</p>
            )}
          </div>

          <div className="chat-input">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écrire un message..."
            />
            <button className="game-primary" onClick={sendMessage}>
              Envoyer
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
