import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import "./lobby.css";

export default function Enigme1() {
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
  const [message, setMessage] = useState("");

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

        <button className="game-secondary" onClick={() => navigate("/jeu")}>Retour au lobby</button>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Énigme 1 🔍</h2>
          <p>
            Observez attentivement les éléments fournis par votre maître du jeu. Chaque détail
            compte et l'échange d'idées avec votre équipe sera déterminant.
          </p>

          <div className="puzzle-instructions">
            <h3>Briefing</h3>
            <ul>
              <li>Partagez vos découvertes dans le chat pour faire progresser l'équipe.</li>
              <li>Notez les indices importants et confrontez vos hypothèses.</li>
              <li>Lorsque vous êtes prêts, contactez le maître du jeu pour valider votre réponse.</li>
            </ul>
          </div>
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
              <p className="empty-state">Partagez vos premières impressions ici.</p>
            )}
          </div>

          <div className="chat-input">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message à l'équipe..."
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