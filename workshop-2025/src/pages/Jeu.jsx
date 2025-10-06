import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import socket from "../socket";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";

export default function Jeu() {
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

  const sendMessage = (content) => {
    const trimmed = content.trim();
    if (trimmed) {
      socket.emit("chatMessage", { room, username, message: trimmed });
    }
  };

  return (
    <div className="game-page">
      <header className="game-header">
        <div>
          <p className="game-room">Salle {room}</p>
          {username && <p className="game-username">Connecté en tant que <strong>{username}</strong></p>}
        </div>
        <BombeTimer startSeconds={600} />
        <button className="game-primary" onClick={() => navigate("/enigme1")}>
          Accéder à l'énigme 1
        </button>
        <button className="game-primary" onClick={() => navigate("/enigme3")}>
          Accéder à l'énigme 3
        </button>
        <button className="game-primary" onClick={() => navigate("/enigme4")}>
          Accéder à l'énigme 4
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
        <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
