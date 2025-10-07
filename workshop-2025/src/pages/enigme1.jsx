import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import Timer from "../components/Timer";
import socket from "../socket";
import "./lobby.css";
import Navigation from "../components/Navigation";

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

  return (
    <div className="game-page">
      <header className="game-header">
        <Navigation />
        <Timer /> 

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
        <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}